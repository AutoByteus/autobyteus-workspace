# Design Spec

## Current-State Read

The supported AutoByteus Applications route already has the right high-level visible owners, but the overall lifecycle boundary is still incomplete.

Current supported spine:

`Applications route -> ApplicationShell.vue -> applicationHostStore.startLaunch(applicationId) -> ApplicationSurface.vue -> ApplicationIframeHost.vue -> bundled entry HTML/JS`

Current ownership facts:

- `ApplicationShell.vue` is already the authoritative admission owner for the supported `/applications/:id` route before a `launchInstanceId` exists.
  - It owns setup/configure gating.
  - It owns the explicit `Enter application` action.
  - It owns host-launch loading/failure before the surface can mount.
- `applicationHostStore.ts` owns backend `ensure-ready` plus per-entry `launchInstanceId` minting. It is intentionally narrow and does not own app runtime UI.
- `ApplicationSurface.vue` is already the authoritative post-launch host owner once a `launchInstanceId` exists.
  - It owns descriptor commit.
  - It owns the ready timeout and retry/failure overlays.
  - It owns the reveal gate that keeps the iframe visually hidden until bootstrap succeeds.
- `ApplicationIframeHost.vue` is a thin bridge only. It should stay that way.

Current fragmentation problems:

1. **Bundle startup ownership is duplicated per app**
   - Brief Studio and Socratic Math Teacher both parse launch hints themselves.
   - Both wire the ready/bootstrap `postMessage` loop themselves.
   - Both own visible `status-banner` startup UX in app code.
   - The app authoring pattern is therefore teaching the wrong owner.

2. **Raw direct bundle entry is accidental behavior, not intentional product policy**
   - The bundle asset route serves `ui/index.html` as a static file.
   - Opening the bundle directly bypasses the supported host shell.
   - The visible state becomes whatever app-authored waiting placeholder the bundle happened to ship.

3. **The cross-boundary iframe/bootstrap contract is not owned in one shared contracts package**
   - The reviewed contract currently lives as a host-local web type file plus duplicated string constants in bundle code.
   - That is a cross-boundary contract with no single code owner.

4. **The current teaching samples expose business DOM too early**
   - The sample app HTML roots still contain visible business-first homepage structure.
   - The supported host path hides that through the host reveal gate, but raw direct-open still exposes it.
   - This keeps the wrong lifecycle expectation alive: “bundle HTML may render business UI before bootstrap, and host/UI policy will clean it up later.”

Constraints the target design must respect:

- Keep the supported host route ownership that already exists: `ApplicationShell.vue` before `launchInstanceId`, `ApplicationSurface.vue` after `launchInstanceId`.
- Keep the reviewed v2 ready/bootstrap contract semantics intact.
- Do not introduce a giant global lifecycle manager.
- Do not introduce a heavyweight state-machine framework.
- Prefer one clean bundle startup owner over app-by-app duplicated boot code.
- Reject backward-compatibility wrappers that normalize both old manual startup and new framework startup as steady-state patterns.

## Intended Change

Complete the lifecycle ownership model with a simple ownership-first design:

1. **Keep the supported host journey exactly on the current owner split**
   - `ApplicationShell.vue` remains the admission owner.
   - `ApplicationSurface.vue` remains the post-launch bootstrap/reveal owner.

2. **Introduce one framework-owned bundle startup boundary in `@autobyteus/application-frontend-sdk`**
   - It becomes the authoritative bundle-side owner for:
     - launch-hint parsing,
     - ready/bootstrap handshake wiring,
     - unsupported direct-open behavior,
     - post-delivery startup loading/failure containment inside the bundle root,
     - bootstrap acceptance, and
     - handoff into business app mount.

3. **Move the iframe/bootstrap contract into `@autobyteus/application-sdk-contracts`**
   - The cross-boundary contract becomes code-owned in one shared package rather than host-local plus app-local duplication.

4. **Refactor sample apps to post-bootstrap business mount only**
   - App entry HTML becomes a minimal mount root instead of visible business UI.
   - App runtime code no longer parses query hints or listens for bootstrap directly.
   - App runtime starts only after the startup boundary finishes local startup and the bootstrapped callback returns successfully.

5. **Treat naked raw bundle entry as unsupported by default via the framework startup boundary**
   - Direct-open remains technically reachable as a raw asset URL.
   - But its behavior becomes intentionally framework-owned unsupported-entry behavior instead of app-authored placeholder UX.

This yields one straightforward lifecycle model:

`configure -> launch -> bootstrap delivery -> bundle startup handoff -> app runtime`

with one authoritative owner at each visible phase, and only small local lifecycle states inside each owner.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

Additional scope terms used here:

- `Admission`: the supported host-route lifecycle before a `launchInstanceId` exists.
- `Bootstrap reveal gate`: the supported host-route lifecycle after a `launchInstanceId` exists but before the app canvas is revealed.
- `HostedApplicationStartup`: the new framework-owned bundle startup owner inside the frontend SDK.
- `Startup handoff complete`: the bundle-local point where `HostedApplicationStartup` has accepted/validated bootstrap, created runtime context successfully, and the business mount callback has returned/resolved without error.
- `Startup failure`: a bundle-local failure after bootstrap delivery but before startup handoff completes.
- `Business app mount`: the app-owned post-bootstrap runtime/UI start.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-HALO-001 | Primary End-to-End | User enters `/applications/:id` and clicks `Enter application` | App business UI is revealed and running after startup handoff completes | `ApplicationShell.vue` before `launchInstanceId`, then `ApplicationSurface.vue`, then `HostedApplicationStartup` locally | Defines the authoritative supported product lifecycle including the bundle-local completion boundary |
| DS-HALO-002 | Primary End-to-End | Browser opens bundle entry HTML directly | Framework-owned unsupported-entry surface | `HostedApplicationStartup` | Prevents raw direct-open from becoming an accidental second product mode |
| DS-HALO-003 | Return-Event | `HostedApplicationStartup` emits ready | `HostedApplicationStartup` either reaches startup handoff complete or contains startup failure locally after bootstrap delivery | `ApplicationSurface.vue` on the host side, with shared iframe contract definitions | Captures the preserved cross-boundary handshake plus the bundle-local completion boundary without inventing a new protocol |
| DS-HALO-004 | Bounded Local | `HostedApplicationStartup` starts inside the bundle | It reaches unsupported-entry, startup handoff complete, or startup-failed outcome | `HostedApplicationStartup` | Centralizes bundle startup ownership including the missing post-delivery failure branch |
| DS-HALO-005 | Bounded Local | `ApplicationSurface.vue` receives `launchInstanceId` | It reveals the app canvas or holds failure/retry inside host-owned transition UI | `ApplicationSurface.vue` | Keeps host bootstrap/reveal ownership local and explicit |

## Primary Execution Spine(s)

- `Applications route -> ApplicationShell.vue -> applicationHostStore -> ApplicationSurface.vue -> ApplicationIframeHost.vue -> HostedApplicationStartup -> business app mount`
- `Direct browser entry -> HostedApplicationStartup -> unsupported-entry screen`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-HALO-001 | The supported route keeps host lifecycle ownership front and center. The shell owns setup/admission and requests host launch. Once a `launchInstanceId` exists, the surface owns the bootstrap reveal gate and preserves the reviewed rule that host bootstrap completes on delivery of the bootstrap envelope. After that reveal point, the bundle startup owner still controls the bundle root until it either completes runtime-context construction and business mount successfully or shows a framework-owned startup failure surface. | `ApplicationShell.vue`, `applicationHostStore`, `ApplicationSurface.vue`, `ApplicationIframeHost.vue`, `HostedApplicationStartup`, business app mount | `ApplicationShell.vue` then `ApplicationSurface.vue`, with `HostedApplicationStartup` owning bundle-local completion | shared iframe contract definitions, backend transport client creation, generated app-specific clients |
| DS-HALO-002 | Direct raw entry no longer exposes app-authored waiting UI or business DOM. The bundle startup owner detects unsupported entry context before business app mount and renders one framework-owned unsupported-entry state. | `HostedApplicationStartup`, unsupported-entry screen | `HostedApplicationStartup` | neutral startup rendering, launch-hint parsing |
| DS-HALO-003 | The bundle startup owner emits the reviewed ready event. The host bridge and surface validate it and post the reviewed bootstrap envelope. The host reveal rule still ends there. Inside the bundle, the startup owner then validates the delivered payload, builds the runtime context, invokes the business mount callback, and either reaches startup handoff complete or absorbs startup failure locally without inventing a new protocol. | `HostedApplicationStartup`, `ApplicationIframeHost.vue`, `ApplicationSurface.vue` | `ApplicationSurface.vue` for supported route semantics, then `HostedApplicationStartup` locally | shared event names, validators, payload builders |
| DS-HALO-004 | Inside the bundle, startup follows one small finite-state gate: detect entry context, decide unsupported vs waiting, accept and validate bootstrap, enter local startup while runtime context is built and the mount callback runs, then reach `handoff_complete` or `startup_failed`. No app business code owns visible lifecycle before handoff completes. | `HostedApplicationStartup` | `HostedApplicationStartup` | default startup rendering, application client construction |
| DS-HALO-005 | Inside the host surface, post-launch behavior remains a small finite-state gate: descriptor commit, wait for ready, deliver bootstrap, reveal on success, hold failure/retry in host-owned UI on failure. | `ApplicationSurface.vue` | `ApplicationSurface.vue` | thin iframe bridge, timeout/retry policy |

## Spine Actors / Main-Line Nodes

- User / supported Applications route
- `ApplicationShell.vue`
- `applicationHostStore.ts`
- `ApplicationSurface.vue`
- `ApplicationIframeHost.vue`
- `HostedApplicationStartup` (new frontend SDK boundary)
- business app mount callback / app runtime
- direct browser entry (raw path)
- unsupported-entry screen

## Ownership Map

- `ApplicationShell.vue`
  - owns admission lifecycle for the supported host route
  - owns setup/configure visibility, route phase, enter/reload/exit intents, and pre-`launchInstanceId` host loading/failure
  - does **not** own iframe handshake or bundle startup internals

- `applicationHostStore.ts`
  - owns backend `ensure-ready` orchestration plus `launchInstanceId` minting
  - owns no visible app business UI

- `ApplicationSurface.vue`
  - owns post-launch host lifecycle for the supported route
  - owns descriptor commit, ready timeout, bootstrap delivery, failure/retry, and reveal gate
  - does **not** own admission setup or app business state

- `ApplicationIframeHost.vue`
  - thin public bridge only
  - owns window/iframe message transport plumbing and raw event validation handoff
  - must not secretly own lifecycle policy

- `HostedApplicationStartup`
  - owns bundle launch-hint parsing, unsupported direct-open detection, ready emission, bootstrap acceptance/validation, local startup while runtime context is being created, startup-failure containment after bootstrap delivery, and the one handoff into business app mount
  - does **not** own host route lifecycle or long-lived app business workflow state

- business app mount / app runtime
  - owns post-bootstrap business UI, business data loading, business empty/error states, and app workflows
  - ownership begins only after startup handoff completes
  - must not own pre-bootstrap lifecycle UX or handshake plumbing

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationIframeHost.vue` | `ApplicationSurface.vue` | Isolate iframe DOM + `postMessage` bridge mechanics | host lifecycle policy, reveal policy, retry ownership |
| `app.js` entry files inside sample apps | `HostedApplicationStartup` first, then business app mount | Keep bundle entrypoints tiny and declarative | launch-hint parsing, direct-open policy, ready/bootstrap handshake logic |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| App-authored visible `status-banner` startup UX in Brief Studio and Socratic Math Teacher | Startup UX belongs to framework startup owner, not business app code | `HostedApplicationStartup` default unsupported-entry / local-starting / startup-failed behavior plus host reveal gate | In This Change | Remove app-owned waiting/failure placeholders |
| App-authored query-string parsing and ready/bootstrap `postMessage` logic in sample app runtimes | Bundle startup mechanics need one framework owner | `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | In This Change | Sample apps should no longer wire bootstrap manually |
| Host-local shared iframe contract file `autobyteus-web/types/application/ApplicationIframeContract.ts` | Cross-boundary contract belongs in shared contracts package | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | In This Change | Clean-cut shared owner; no wrapper layer |
| Sample app business-first static HTML shells that expose visible DOM before bootstrap | Business UI should mount after bootstrap, not exist as visible static HTML | minimal app root + post-bootstrap mount callback | In This Change | Prevents direct-open DOM leakage |
| Docs/sample guidance that imply apps own pre-bootstrap lifecycle UX | Wrong long-term teaching pattern | updated docs for shared startup boundary + post-bootstrap app ownership | In This Change | Must become the recommended authoring model |
| Manual-per-app startup logic in already-imported external bundles | Clean target design replaces manual startup pattern | migration onto shared startup boundary | Follow-up | Risk tracked; not normalized as steady state |

## Return Or Event Spine(s) (If Applicable)

`HostedApplicationStartup -> ApplicationUiReadyEnvelopeV2 -> ApplicationIframeHost.vue -> ApplicationSurface.vue -> ApplicationHostBootstrapEnvelopeV2 -> HostedApplicationStartup -> startup handoff complete | startup_failed`

This return/event spine matters because the supported host route still depends on the reviewed handshake boundary, but the startup owner changes from “each app runtime manually handles it” to “one shared startup boundary handles it,” including the bundle-local success/failure result after host bootstrap delivery.

## Bounded Local / Internal Spines (If Applicable)

### BLS-HALO-001 — Host reveal gate
- Parent owner: `ApplicationSurface.vue`
- Short arrow chain:
  `launchInstanceId -> launch descriptor commit -> wait for ready -> deliver bootstrap -> reveal app canvas | host-owned failure/retry`
- Why this bounded local spine matters:
  It keeps post-launch lifecycle ownership in one host owner instead of scattering it across shell, iframe bridge, and app code.

### BLS-HALO-002 — Bundle startup gate
- Parent owner: `HostedApplicationStartup`
- Short arrow chain:
  `read launch context -> unsupported_entry | waiting_for_bootstrap -> accept/validate bootstrap -> starting_app -> handoff_complete | startup_failed`
- Why this bounded local spine matters:
  It makes the bundle startup finite, local, and reusable without turning startup into a global manager, and it closes the lifecycle that remains after the host reveal gate still opens on bootstrap delivery.

Local startup states/results owned by `HostedApplicationStartup`:
- `unsupported_entry`
  - no valid host launch context exists
  - visible behavior: framework-owned unsupported-entry screen
- `waiting_for_bootstrap`
  - valid host launch hints exist and the startup owner has emitted `ready`
  - visible behavior: framework-owned startup waiting surface inside the bundle root (normally hidden by the host reveal gate on the supported route)
- `starting_app`
  - bootstrap envelope has been delivered, validated, and the startup owner is creating runtime context and invoking the business mount callback
  - visible behavior: framework-owned startup-in-progress surface remains visible inside the bundle root until handoff completes
- `startup_failed`
  - visible bundle-local failure after bootstrap delivery but before handoff completes
  - failures absorbed here:
    - invalid or malformed bootstrap payload,
    - runtime-context construction failure, and
    - business mount callback throw/reject
  - visible behavior: framework-owned full-root startup-failure surface replaces the startup root and the business app is not considered mounted
- `handoff_complete`
  - startup handoff is complete only when runtime-context construction succeeded and the business mount callback returned/resolved successfully
  - after this point, business UI ownership belongs to the app runtime rather than `HostedApplicationStartup`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Shared iframe/bootstrap contract definitions | DS-HALO-001, DS-HALO-003, DS-HALO-004, DS-HALO-005 | `ApplicationSurface.vue`, `HostedApplicationStartup` | Own event names, query-hint names, envelope types, and validators/builders | One authoritative cross-boundary code owner is required | Duplication and contract drift across host and bundles |
| Application client transport helpers | DS-HALO-001, DS-HALO-004 | business app mount | Build GraphQL/query/command/notification clients after bootstrap | Business code still needs backend transport after startup | Startup owner would become overloaded with business API logic |
| Default startup rendering | DS-HALO-002, DS-HALO-004 | `HostedApplicationStartup` | Show neutral waiting, unsupported-entry, and startup-failure surfaces inside the bundle root | The startup owner needs one visible framework-owned surface family until handoff completes | Business apps would start owning direct-open or startup-failure UX |
| Sample-package vendor sync | DS-HALO-001, DS-HALO-004 | sample application packaging | Keep frontend SDK runtime available inside shipped bundle `ui/vendor/` | Existing sample packaging path already does this | Startup distribution would fragment into a second packaging mechanism |
| Durable docs / authoring guidance | DS-HALO-001, DS-HALO-002 | all owners | Teach the new lifecycle boundary and app authoring pattern | Prevent future drift back into app-authored startup UX | Teams would reintroduce duplicated startup code |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Supported host admission lifecycle | `autobyteus-web/components/applications` | Reuse | Correct owner already exists in `ApplicationShell.vue` | N/A |
| Supported host post-launch bootstrap/reveal lifecycle | `autobyteus-web/components/applications` | Reuse | Correct owner already exists in `ApplicationSurface.vue` | N/A |
| Cross-boundary iframe/bootstrap contract | `@autobyteus/application-sdk-contracts` | Extend | Shared package already owns other host/app request-context and contract types | Host-local file is not the right owner for cross-boundary contract |
| Bundle startup lifecycle owner | `@autobyteus/application-frontend-sdk` | Extend | SDK already owns bundle-side frontend integration helpers | Per-app runtime files are the wrong owner |
| Raw direct-open behavior | bundle startup boundary inside frontend SDK | Extend | Same owner should decide whether business app mount is allowed | Server asset route should stay transport-only for this scope |
| Sample package distribution of startup runtime | existing sample `build-package.mjs` vendor sync | Reuse | Current scripts already vendor the frontend SDK | No separate packaging subsystem is needed |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications` | supported route admission + post-launch reveal lifecycle | DS-HALO-001, DS-HALO-003, DS-HALO-005 | `ApplicationShell.vue`, `ApplicationSurface.vue` | Reuse | Keep current owner split |
| `@autobyteus/application-sdk-contracts` | shared iframe/bootstrap constants, hints, payload types, validators/builders | DS-HALO-001, DS-HALO-003, DS-HALO-004, DS-HALO-005 | host + bundle startup owners | Extend | One authoritative cross-boundary owner |
| `@autobyteus/application-frontend-sdk` | bundle startup gate + transport helpers | DS-HALO-001, DS-HALO-002, DS-HALO-004 | `HostedApplicationStartup` + business app mount | Extend | Startup and transport remain bundle-side framework responsibilities |
| `applications/*` sample app workspaces | post-bootstrap business UI and business clients only | DS-HALO-001 | business app mount | Modify | Remove manual startup ownership |
| durable docs | lifecycle behavior + authoring guidance | all | all | Modify | Must align with the clean-cut target |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | shared contracts | cross-boundary contract owner | iframe/bootstrap query hints, event names, payload/envelope types, builders, validators | One cross-boundary contract file is clearer than host-local + app-local duplication | N/A |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | frontend SDK | bundle startup owner | local startup states/results, ready emission, bootstrap acceptance/validation, startup-failure containment, and app mount handoff completion | One startup boundary should stay coherent | Yes |
| `autobyteus-application-frontend-sdk/src/default-startup-screen.ts` | frontend SDK | startup rendering helper | neutral waiting, unsupported-entry, and startup-failure rendering | Keeps visible startup surfaces separate from startup control flow | No |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | host applications UI | post-launch host owner | imports shared contract, preserves reveal gate ownership | Existing owner remains correct | Yes |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | host applications UI | thin iframe bridge | imports shared contract and stays transport-only | Existing bridge remains correct | Yes |
| `applications/brief-studio/frontend-src/app.js` | sample app | entry wrapper | call shared startup boundary and pass business mount callback | Tiny declarative entry is enough | Yes |
| `applications/brief-studio/frontend-src/brief-studio-runtime.js` | sample app | business runtime | post-bootstrap business UI/data logic only | Removes mixed startup concerns | Yes |
| `applications/brief-studio/frontend-src/index.html` | sample app | mount root | minimal app root only | Prevents pre-bootstrap business DOM exposure | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| iframe query-hint names, channel/event names, payload/envelope types, builders, validators | `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | shared contracts | Both host and bundle startup need the same contract | Yes | Yes | host-only helper file or duplicated app constants |
| bundle startup finite-state gate | `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | frontend SDK | Every hosted app currently duplicates the same startup logic | Yes | Yes | a giant app framework or business workflow manager |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationIframeLaunchHints` / ready / bootstrap envelopes | Yes | Yes | Low | Move them into one shared contract file and remove host-local duplication |
| `HostedApplicationStartup` local state model | Yes | Yes | Low | Keep the state/result model explicit: `unsupported_entry`, `waiting_for_bootstrap`, `starting_app`, `startup_failed`, `handoff_complete` |
| startup callback context (`bootstrap`, `applicationClient`, `rootElement`) | Yes | Yes | Low | Keep callback context narrow and post-bootstrap only |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | shared contracts | cross-boundary contract owner | authoritative iframe/bootstrap constants, types, builders, and validators | One coherent cross-boundary contract file | N/A |
| `autobyteus-application-sdk-contracts/src/index.ts` | shared contracts | package export surface | export iframe/bootstrap contract alongside existing app contracts | Keeps public contract package authoritative | Yes |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | frontend SDK | `HostedApplicationStartup` | bundle startup finite-state owner, startup-failure containment, and app mount handoff completion owner | Owns one subject: startup gate until handoff completes | Yes |
| `autobyteus-application-frontend-sdk/src/default-startup-screen.ts` | frontend SDK | startup rendering helper | render neutral waiting, unsupported-entry, and startup-failure UI variants | Keeps startup flow file from mixing rendering detail | No |
| `autobyteus-application-frontend-sdk/src/index.ts` | frontend SDK | package export surface | export the startup boundary with existing transport helpers | One public frontend SDK surface | Yes |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | host applications UI | supported post-launch host owner | preserve reveal gate and import shared contract definitions | Keeps host reveal authority local | Yes |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | host applications UI | thin iframe bridge | stay bridge-only while importing shared contract definitions | Keeps no hidden ownership creep | Yes |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | host applications UI | descriptor helper | derive iframe src/hints using shared contract definitions | Correct helper home | Yes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | host applications UI | obsolete local contract file | remove/decommission | Shared package becomes authoritative | N/A |
| `applications/brief-studio/frontend-src/app.js` | sample app | entry wrapper | start hosted application and pass mount callback | Tiny wrapper only | Yes |
| `applications/brief-studio/frontend-src/brief-studio-runtime.js` | sample app | business runtime | post-bootstrap business logic only | Removes manual startup concerns | Yes |
| `applications/brief-studio/frontend-src/index.html` | sample app | minimal DOM root | mount root only, no visible business shell | Prevents raw direct-open exposure | No |
| `applications/socratic-math-teacher/frontend-src/app.js` | sample app | entry wrapper | same ownership pattern as Brief Studio | Enforces one teaching pattern | Yes |
| `applications/socratic-math-teacher/frontend-src/socratic-runtime.js` | sample app | business runtime | post-bootstrap lesson business logic only | Removes manual startup concerns | Yes |
| `applications/socratic-math-teacher/frontend-src/index.html` | sample app | minimal DOM root | mount root only | Prevents raw direct-open exposure | No |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | docs | contract doc | document shared contract owner and supported startup semantics | Durable truth source | Yes |
| `autobyteus-web/docs/applications.md` | docs | lifecycle behavior doc | document supported host lifecycle plus framework startup boundary | Durable truth source | Yes |
| `autobyteus-application-frontend-sdk/README.md` | docs | author-facing SDK doc | document `startHostedApplication(...)` pattern | Author guidance must match target design | Yes |
| `applications/brief-studio/README.md`, `applications/socratic-math-teacher/README.md` | docs | sample authoring docs | teach post-bootstrap business mount pattern | Sample docs must stop normalizing manual startup | Yes |

## Ownership Boundaries

The target design keeps one owner per lifecycle phase and forbids mixed-level access.

1. **Admission boundary**
   - `ApplicationShell.vue` remains the authoritative public entrypoint for the supported host route before `launchInstanceId`.
   - Callers above it must not bypass into `ApplicationSurface.vue` or the iframe bridge.

2. **Post-launch reveal boundary**
   - `ApplicationSurface.vue` remains the authoritative host boundary after `launchInstanceId`.
   - It encapsulates `ApplicationIframeHost.vue` and the host-side reveal state.
   - Callers above it must not manipulate ready/bootstrap internals directly.

3. **Bundle startup boundary**
   - `HostedApplicationStartup` becomes the authoritative bundle entry boundary.
   - Business app code must not parse query hints, emit ready envelopes, listen for bootstrap directly, or absorb startup-failure behavior before handoff completes.

4. **Business runtime boundary**
   - The app mount callback becomes the point where app-specific business ownership begins.
   - The framework startup boundary stops only after startup handoff completes.

5. **Adjacent team-member runtime authority dependency**
   - This ticket does not redesign runtime-control architecture, but live hosted-application validation currently depends on one adjacent authority rule staying correct: internal AutoByteus team-member runs remain owned beneath `TeamRun`, not beneath the public single-run `AgentRunManager`.
   - Any run-scoped side effect that addresses a `memberRunId` (for example artifact publication ingress) must resolve that identity through the team-owned member-runtime boundary or another binding-owned ingress owner.
   - The lifecycle design here must not be implemented in a way that normalizes public single-run active-run lookup as the authority for internal team-member publication.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | route phase changes, launch gating, `applicationHostStore` orchestration, immersive presentation sync | route/page layer | page or parent reaching directly into `ApplicationSurface.vue` or `applicationHostStore` launch internals | add/reshape shell intents/props/events |
| `ApplicationSurface.vue` | descriptor commit, timeout, bootstrap delivery, reveal/failure gating, iframe bridge usage | `ApplicationShell.vue` | shell or app code manipulating iframe ready/bootstrap bridge directly | extend surface props/events, not bridge bypasses |
| `HostedApplicationStartup` | query parsing, direct-open decision, ready emission, bootstrap wait/acceptance, startup-failure containment, and app mount callback invocation/completion | sample app entry file | app runtime reading query params or wiring `postMessage` itself, or app code owning post-delivery startup failure before handoff completes | narrow startup callback/context API |
| shared iframe contract package | event names, hints, envelope builders/validators | host web + frontend SDK | host-local and app-local duplicated constants/types | move missing contract pieces into shared package |

## Dependency Rules

- `ApplicationShell.vue` may depend on `applicationHostStore.ts`, `ApplicationSurface.vue`, and route/layout collaborators.
- `ApplicationShell.vue` must not depend on `ApplicationIframeHost.vue` or bundle startup internals.
- `ApplicationSurface.vue` may depend on shared contract definitions, descriptor helpers, transport builders, and `ApplicationIframeHost.vue`.
- `ApplicationSurface.vue` must not depend on app business runtimes or sample app code.
- `ApplicationIframeHost.vue` may depend on shared contract definitions only; it must remain a thin bridge.
- `HostedApplicationStartup` may depend on shared contract definitions and frontend SDK transport helpers.
- Business app runtimes may depend on `HostedApplicationStartup` callback context and app-specific generated clients.
- Business app runtimes must not parse launch hints, subscribe to bootstrap `postMessage`, render pre-bootstrap unsupported-entry/waiting UX, or own startup failure before handoff completes.
- The server asset route remains transport-oriented in this design; it must not grow app-specific lifecycle policy.
- Adjacent runtime publication/event ingress for internal team members must not depend on `AgentRunManager.getActiveRun(memberRunId)` when the runtime owns those member runs beneath `TeamRun`; that is a forbidden mixed-authority bypass even if a quick implementation patch makes it appear convenient.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationShell.vue` props / route handling | supported host admission lifecycle | route-level configure/enter/reload/exit ownership | `applicationId` route identity | No iframe/bootstrap internals |
| `ApplicationSurface.vue` props (`application`, `launchInstanceId`) | supported post-launch reveal lifecycle | host-side post-launch bootstrap/reveal ownership | `applicationId` + `launchInstanceId` | Keeps reveal authority local |
| `startHostedApplication(options)` | bundle startup lifecycle | run startup gate, own post-delivery startup failure behavior, and invoke business mount only after valid bootstrap | launch hints + current window/document context | New frontend SDK public boundary |
| `onBootstrapped(context)` callback | business app mount | begin app-specific runtime/UI ownership | bootstrapped runtime context | Handoff completes only if the callback returns/resolves successfully; throw/reject stays startup-owned |
| `createApplicationClient(options)` | bundle transport client | create GraphQL/query/command/notification transport client | `applicationId` + request context | Existing SDK boundary reused |
| shared iframe contract builders/validators | cross-boundary handshake | define/validate event/payload shapes | explicit launch/application identities | Shared package owner |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | Yes | Yes | Low | Keep setup/launch ownership here only |
| `ApplicationSurface.vue` | Yes | Yes | Low | Keep reveal/bridge coordination local |
| `startHostedApplication(options)` | Yes | Yes | Low | Keep API focused on startup gate, not business helpers |
| `onBootstrapped(context)` | Yes | Yes | Low | Keep it as the one business handoff callback; startup failures remain in `HostedApplicationStartup` |
| `createApplicationClient(options)` | Yes | Yes | Low | Keep transport concerns separate from startup lifecycle |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| bundle startup owner | `HostedApplicationStartup` / `startHostedApplication(...)` | Yes | Low | Use one consistent name in code and docs |
| supported route admission owner | `ApplicationShell.vue` | Yes | Low | Keep as-is |
| supported post-launch reveal owner | `ApplicationSurface.vue` | Yes | Low | Keep as-is |
| post-bootstrap app boundary | business app mount | Yes | Medium | Use clear callback names like `onBootstrapped` or `mountApp` |

## Applied Patterns (If Any)

- **Lightweight local finite-state pattern**
  - `ApplicationShell.vue`, `ApplicationSurface.vue`, and `HostedApplicationStartup` each own a small finite lifecycle.
  - This is a local implementation pattern only, not a global architecture pattern.
- **Adapter / bridge**
  - `ApplicationIframeHost.vue` remains a transport adapter between iframe DOM events and the surface owner.
- **Shared contract package**
  - The iframe/bootstrap handshake is treated like any other cross-boundary contract and moved into the shared contracts package.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | File | shared cross-boundary contract | authoritative iframe/bootstrap constants, hints, envelope types, validators/builders | Cross-boundary contract belongs with other shared app contracts | host-only UI policy or business app logic |
| `autobyteus-application-sdk-contracts/src/index.ts` | File | package export surface | export shared contract | Makes the shared package authoritative | host-only helper wrappers |
| `autobyteus-application-frontend-sdk/src/hosted-application-startup.ts` | File | `HostedApplicationStartup` | startup finite-state gate, startup-failure containment, and app mount handoff completion | Frontend SDK already owns bundle-side helpers | app business workflow logic |
| `autobyteus-application-frontend-sdk/src/default-startup-screen.ts` | File | startup renderer | neutral waiting, unsupported-entry, and startup-failure surfaces | Keeps startup control flow cleaner | host route policy or business UI |
| `autobyteus-application-frontend-sdk/src/index.ts` | File | package export surface | export startup API plus transport APIs | One public SDK surface | app-specific code |
| `autobyteus-web/components/applications/ApplicationShell.vue` | File | supported host admission owner | preserve setup/admission lifecycle | Existing correct owner | iframe bridge internals |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | File | supported post-launch host owner | preserve reveal gate using shared contract imports | Existing correct owner | app business runtime |
| `autobyteus-web/components/applications/ApplicationIframeHost.vue` | File | thin iframe bridge | remain transport-only | Existing correct adapter | lifecycle policy |
| `autobyteus-web/utils/application/applicationLaunchDescriptor.ts` | File | host descriptor helper | build hinted iframe src using shared contract definitions | Correct helper home | direct app startup logic |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | File | obsolete host-local contract | remove | shared package replaces it | any active contract ownership |
| `applications/brief-studio/frontend-src/app.js` | File | sample entry wrapper | delegate to startup API and mount app on bootstrap | Tiny entry keeps ownership readable | manual handshake code |
| `applications/brief-studio/frontend-src/index.html` | File | bundle root | minimal mount container only | Prevent pre-bootstrap DOM leakage | visible business shell |
| `applications/brief-studio/frontend-src/brief-studio-runtime.js` | File | business runtime | post-bootstrap business logic only | Clean app ownership | startup parsing/unsupported UI |
| `applications/socratic-math-teacher/frontend-src/app.js` | File | sample entry wrapper | same as Brief Studio | Keeps one teaching pattern | manual handshake code |
| `applications/socratic-math-teacher/frontend-src/index.html` | File | bundle root | minimal mount container only | Prevent pre-bootstrap DOM leakage | visible business shell |
| `applications/socratic-math-teacher/frontend-src/socratic-runtime.js` | File | business runtime | post-bootstrap business logic only | Clean app ownership | startup parsing/unsupported UI |
| `autobyteus-web/docs/applications.md` | File | durable lifecycle doc | describe supported host route + framework startup boundary | Canonical frontend behavior doc | stale app-owned startup guidance |
| `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` | File | durable contract doc | point to shared contract owner and handshake semantics | Canonical contract doc | host-local duplication claims |
| `autobyteus-application-frontend-sdk/README.md` | File | author-facing SDK doc | teach `startHostedApplication(...)` | Author guidance must match architecture | transport-only story that ignores startup owner |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/` | Mixed Justified | Yes | Low | This folder already owns the supported route shell, setup gate, and surface owner. Keeping the two host owners here is clearer than introducing artificial subfolders for this scope. |
| `autobyteus-application-sdk-contracts/src/` | Transport | Yes | Low | Shared contract package is the right owner for cross-boundary definitions. |
| `autobyteus-application-frontend-sdk/src/` | Main-Line Domain-Control | Yes | Low | Startup + client helper boundaries both belong in the bundle-side frontend SDK. |
| `applications/*/frontend-src/` | Main-Line Domain-Control | Yes | Medium | Sample app entry files must stay thin; business runtime files must not absorb startup ownership again. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Supported lifecycle ownership | `Enter application -> host launch -> host reveal gate -> startup accepts bootstrap -> app business mount` | `Enter application -> app homepage visible immediately -> app banner says "Waiting for host bootstrap"` | Makes the ownership boundary concrete |
| Bundle startup authoring pattern | `app.js -> startHostedApplication({ onBootstrapped: mountBriefStudio })` | `app.js -> parse URL hints -> add message listeners -> maintain startup banner -> then mount app` | Shows the clean-cut authoring target |
| Bundle startup failure after host delivery | `host delivers bootstrap -> startup validates payload/builds context -> mount callback throws -> HostedApplicationStartup shows startup-failure surface and app ownership never begins` | `host delivers bootstrap -> app code throws during first mount -> sample app banner/business DOM improvises failure UX` | Makes the missing post-delivery failure ownership explicit |
| State-machine scope | `ApplicationShell`, `ApplicationSurface`, and `HostedApplicationStartup` each own one tiny local finite state` | `one global application lifecycle manager with all flags and business states mixed together` | Keeps the design simple and rule-correct |
| Cross-boundary contract ownership | `shared contract package exports ready/bootstrap constants and envelope validators` | `host-local contract file + duplicated app string constants` | Eliminates drift and keeps authority explicit |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep app-authored startup banners as fallback while new startup API is added | Might soften migration for old bundles | Rejected | Remove sample startup banners and teach one framework-owned startup boundary |
| Support both manual per-app handshake code and shared startup boundary as equal steady-state patterns | Might avoid touching existing sample apps deeply | Rejected | Refactor sample apps onto the shared startup boundary |
| Preserve host-local iframe contract file while also adding shared contract definitions | Might reduce host-side edits | Rejected | Move contract ownership into `@autobyteus/application-sdk-contracts` and remove host-local file |
| Add a large global lifecycle manager to unify all statuses | Might centralize visible states | Rejected | Keep small local finite states inside each owner boundary |
| Treat raw direct-open as “implicitly okay for debugging” | Avoids explicit unsupported-entry behavior | Rejected | Framework startup boundary renders unsupported-entry behavior by default |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

A useful explanation layer after ownership is clear:

- **Supported host admission layer**: `ApplicationShell.vue` + route/layout collaborators
- **Supported host post-launch layer**: `ApplicationSurface.vue` + `ApplicationIframeHost.vue`
- **Shared contract layer**: iframe/bootstrap contract package
- **Bundle startup layer**: `HostedApplicationStartup`
- **Business app layer**: app-specific runtime/UI

This layering is descriptive only. Ownership remains the primary design principle.

## Migration / Refactor Sequence

1. **Lock approval and produce shared contract owner**
   - Add `application-iframe-contract.ts` to `@autobyteus/application-sdk-contracts`.
   - Export it publicly.

2. **Move host code onto the shared contract**
   - Update `ApplicationSurface.vue`, `ApplicationIframeHost.vue`, and descriptor helpers to import from the shared package.
   - Remove `autobyteus-web/types/application/ApplicationIframeContract.ts`.

3. **Add the bundle startup owner in the frontend SDK**
   - Implement `startHostedApplication(...)` / `HostedApplicationStartup`.
   - Give it a small local finite state:
     - `unsupported_entry`
     - `waiting_for_bootstrap`
     - `starting_app`
     - `startup_failed`
     - `handoff_complete`
   - Keep visible waiting/failure/unsupported behavior minimal and framework-owned.
   - Define startup failure ownership explicitly for invalid bootstrap, runtime-context creation failure, and mount-callback throw/reject.

4. **Refactor sample app entrypoints onto the startup owner**
   - Replace manual launch-hint parsing and message listeners in sample runtimes.
   - Make `app.js` a thin wrapper that calls the shared startup API.
   - Move all remaining code in runtime files to post-bootstrap business logic only.

5. **Replace visible static business-first HTML with minimal mount roots**
   - Update sample `index.html` files to contain only a minimal root container and any truly neutral document scaffolding.
   - Remove visible `status-banner` placeholders and business-first static shell content.

6. **Update docs and authoring guidance**
   - Document the supported host ownership model.
   - Document the shared startup boundary.
   - Document that raw direct-open is unsupported by default.

7. **Remove obsolete sample startup logic and teaching artifacts**
   - Delete old manual startup code and related styles/markup.
   - Ensure no duplicate launch-hint constants remain in sample apps.

## Key Tradeoffs

- **Shared startup owner vs app-by-app flexibility**
  - Decision: prefer one framework startup owner.
  - Why: startup lifecycle is infrastructure, not business differentiation.

- **Preserved host reveal boundary vs later bundle-local completion**
  - Decision: keep the reviewed host reveal rule at bootstrap delivery, but explicitly add bundle-local startup completion/failure ownership afterward.
  - Why: this preserves the reviewed protocol while still giving one owner to the remaining lifecycle inside the bundle root.

- **Small local finite states vs one global lifecycle manager**
  - Decision: keep lifecycle finite and explicit inside each owner only.
  - Why: maintains architectural clarity without overengineering.

- **Framework-owned unsupported direct-open behavior vs implicit debug reachability**
  - Decision: unsupported by default.
  - Why: avoids creating a second accidental product surface.

- **Shared contract package vs host-local contract file**
  - Decision: move the contract into `@autobyteus/application-sdk-contracts`.
  - Why: the handshake is cross-boundary by nature.

## Risks

- Non-migrated external/imported bundles that still implement manual startup will need a migration path; this design intentionally does not preserve the old pattern as steady state.
- The neutral unsupported-entry screen in the frontend SDK will need restrained styling and messaging so it does not become app-specific or visually noisy.
- The neutral startup-failure surface must stay narrow and framework-owned without silently turning into a second app customization surface.
- Sample apps with business-first static HTML will require deeper restructuring than just removing a banner.
- Live hosted-application validation for AutoByteus team-based samples currently has one adjacent server/runtime dependency: `publish_artifact` still resolves authority through the public single-run `AgentRunManager`, while native team members are internal `TeamRun`-owned runtimes. If implementation touches that path, the corrective design must keep team-member run identity under the team-owned boundary instead of widening the public single-run manager into a mixed public/internal authority.

## Guidance For Implementation

- Preserve the current supported host-route owner split; do not invent a new host lifecycle manager.
- Keep `ApplicationIframeHost.vue` thin.
- Keep `HostedApplicationStartup` focused on startup only; do not let it absorb app business transport rules beyond creating the basic runtime context.
- Let business app code begin only through the startup callback after valid bootstrap acceptance, runtime-context construction success, and callback return/resolve.
- Keep startup failure inside `HostedApplicationStartup` for invalid/malformed bootstrap, runtime-context construction failure, and mount-callback throw/reject.
- Keep the framework-owned startup surface visible until handoff completes; if startup fails, show the framework-owned failure surface instead of app business UI.
- Use small local finite states and guarded transitions inside each owner boundary.
- Do not add compatibility wrappers for the old manual startup pattern.
- If live sample validation exposes the AutoByteus team-member `publish_artifact` failure, treat it as an adjacent runtime-authority fix: route team-member publication through the owning team/member-runtime or binding-owned ingress boundary rather than adding a lifecycle-layer workaround or teaching the public single-run manager to masquerade as the owner of internal team-member runs.
