# Application-Owned Runtime Orchestration Design

## Current-State Read

The current architecture organizes launched applications around `applicationSession` as the durable governing owner. That single concept currently owns too many different responsibilities at once:

- page launch identity,
- live runtime identity,
- active-session replacement,
- retained platform projection of runtime artifacts,
- route reattachment,
- session streaming,
- publication/event routing, and
- the assumption that one launched application implies one launched run.

The current primary execution path is effectively:

`Browser Route -> ApplicationShell/ApplicationSessionStore -> createApplicationSession -> ApplicationSessionService -> AgentRunService / TeamRunService -> ApplicationSessionStateStore -> Iframe Bootstrap`

The current publication return path is:

`Runtime -> publish_artifact -> applicationSessionContext -> ApplicationPublicationService -> session projection + journal -> ApplicationEngine event handler -> app backend`

Current ownership and coupling problems:

1. **Bundle contract overload**
   - `application.json` still requires one singular `runtimeTarget`.
   - The application catalog therefore encodes one launch-time worker identity for every application.

2. **Launch/runtime collapse**
   - `ApplicationSessionService.createApplicationSession(...)` immediately launches one agent or team run.
   - The application page becomes fully usable only after that worker run exists.

3. **Singular live-session enforcement**
   - `ApplicationSessionStateStore.persistLiveSession(...)` clears any prior active session for the same application.
   - This enforces one live launched session per app and therefore one governing run per app page.

4. **Frontend host owns run launch policy**
   - The generic host prepares low-level launch config from the bundle `runtimeTarget` and shows a platform-owned launch modal.
   - The form itself is useful UX for resource setup, but today it is incorrectly coupled to immediate run creation.
   - That means the host, not the application backend, currently owns part of orchestration policy.

5. **Contracts/SDKs propagate the old model**
   - Shared contracts expose `runtimeTarget`, `applicationSessionId`, and session lifecycle handler keys.
   - Iframe bootstrap v1 requires a launched `applicationSessionId` plus runtime identity.
   - Frontend SDK request context defaults to `applicationSessionId`-aware identity.

6. **Platform competes with app-owned projection**
   - The session subsystem retains artifact-centric member projections in platform state and streams them back to the frontend host.
   - That is useful for the old demo path, but it competes with the new model where the application backend must own domain projection and business-state meaning.

7. **Publication routing is session-bound**
   - `publish_artifact` resolves ownership from injected `applicationSessionContext`.
   - The publication model is therefore not naturally compatible with one application-defined business context owning many runs over time.

8. **Restart ownership is incomplete in the current system too**
   - Current server startup has an explicit resume owner for publication dispatch (`resumePendingDispatches()`), but there is no equivalent owner for app-owned orchestration bindings because that subsystem does not yet exist.

9. **Lifecycle observation is asymmetric**
   - Agent execution exposes create/resolve/terminate and run event streams at the run object level.
   - Team execution additionally has a manager-level team-event subscription shape.
   - There is no unified authoritative lifecycle-notification boundary that a new orchestration subsystem can depend on safely for both run kinds.

10. **Good current foundations still exist**
   - `application-engine` already owns application backend worker lifecycle cleanly.
   - `application-backend-gateway` is already keyed by `applicationId`.
   - `agent-run-service` and `team-run-service` already own concrete execution resources.
   - durable at-least-once app-event dispatch is already the right shape.

11. **Current sample apps still under-teach the target app model**
   - Brief Studio is deeper than the minimal sample, but it still teaches query/command-heavy UI flow and session-derived business identity.
   - Socratic Math Teacher is intentionally shallow and does not teach a real business API or reusable run-binding pattern.
   - Neither sample currently teaches app-owned GraphQL schema/codegen over the hosted backend mount.

12. **Application discovery failures are still too global**
   - `ApplicationBundleService.populateCache()` still depends on every discovered application manifest/package validating successfully.
   - One stale imported path or unsupported manifest version can therefore poison startup-time application discovery instead of being isolated to that application/package.

Constraints the target design must respect:

- reuse `application-engine`, `application-backend-gateway`, `application-storage`, `agent-run-service`, and `team-run-service` where they already fit,
- move to a clean-cut target instead of compatibility wrappers,
- allow application backends to orchestrate bundle-local and shared platform resources,
- keep application business meaning out of platform orchestration infrastructure,
- preserve durable event delivery and restart-safe ownership,
- isolate invalid or incompatible application packages from core platform startup, and
- preserve the useful parts of the existing launch-configuration form by repurposing it into persisted resource configuration rather than deleting it blindly.

## Intended Change

Replace the session-owned model with an **engine-first, application-owned orchestration model**:

- opening an application launches the application host/runtime only,
- the generic host ensures the application backend worker is ready and then boots the iframe,
- iframe bootstrap v2 exposes one authoritative hosted `backendBaseUrl` plus only the non-derivable transport channels,
- no worker run is auto-created just because the application page was opened,
- the application backend receives a new authoritative `runtimeControl` boundary in handler/lifecycle context,
- the application backend creates runs explicitly and receives durable platform-owned `bindingId` values,
- the platform persists those bindings as durable platform-owned records, while any business-record-to-binding mapping stays app-owned,
- the platform keeps GraphQL/routes/query/command transport generic under the hosted backend mount,
- each application owns its own business API/schema and generated frontend/backend client story,
- invalid or incompatible applications are quarantined as diagnostics instead of crashing startup for the whole platform,
- the generic host may persist runtime-resource configuration for app-declared resource slots without starting runs immediately, and
- a dedicated recovery owner resumes those bindings on server restart,
- runtime outputs route back by binding/execution context rather than by `applicationSessionId`, and
- the app backend remains the owner of projecting those events into business state.

This is a clean-cut target.
`applicationSession` does **not** survive as a durable governing owner in the new architecture.
The only thin launch-specific identity that remains is the browser/iframe `launchInstanceId`, which is an ephemeral bootstrap correlation token, not a persisted runtime/business owner.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.
- `bindingId`: durable platform-owned identifier for one application-to-run association. This is the primary cross-boundary correlation key.
- `bindingIntentId`: opaque app-supplied token for one pending direct-`startRun(...)` establishment attempt. The platform stores and echoes it, but it does not interpret business meaning from it.
- `run binding`: durable platform-owned record that binds one application to one concrete run and one concrete runtime resource reference.
- `resource ref`: platform-neutral selector for a runtime resource, either bundle-owned/local or shared-platform.
- `launchInstanceId`: ephemeral host/iframe bootstrap identity for one browser launch. Not a durable orchestration owner.
- `execution event ingress`: the single authoritative platform boundary that accepts runtime-originated artifact events and platform-originated run lifecycle events, normalizes them, and appends them to the immutable app-event journal.
- `nonterminal binding`: a run binding still expected to have a live or recoverable runtime attachment after restart.
- `virtual backend mount`: the application-scoped hosted backend namespace under `applicationId` that the platform routes and hosts, even though the application backend does not run its own standalone HTTP server.
- `app-owned business API schema`: the application’s own GraphQL schema, route/OpenAPI contract, shared DTO package, or equivalent business-API contract. This belongs to the application, not to the platform.
- `schema artifact`: one application-owned build artifact such as GraphQL SDL, introspection JSON, OpenAPI document, or generated frontend client/types used for app-owned code generation.
- `pending binding intent`: application-owned durable record written before direct `startRun(...)`. It contains the app’s intended business target plus one `bindingIntentId` so the later created binding can be reconciled safely.
- `app-owned binding mapping`: application-owned persistent state that maps business records such as `ticketId`, `briefId`, or `lessonId` to one or more platform `bindingId` values. The platform does not own this mapping.
- `application catalog snapshot`: best-effort bundle-discovery result containing both valid application catalog entries and invalid/unavailable application diagnostics.
- `application diagnostic`: one invalid, missing, stale, or incompatible application/package condition surfaced without crashing the platform.
- `quarantined application`: an application whose package state is currently invalid or unavailable, so backend launch, runtime control, and backend event delivery are suspended while diagnostics remain visible and durable binding/event state remains repairable.
- `application availability state`: the platform-owned app-scoped readiness state used after startup for invalid/repaired apps: `ACTIVE`, `QUARANTINED`, or `REENTERING`.
- `resource slot`: an application-declared named runtime dependency that the host may configure and persist separately from run creation.
- `resource slot declaration`: the authoritative manifest-declared metadata for one `resource slot`, including stable `slotKey`, display name, allowed resource kinds/owners, required-vs-optional semantics, and optional default resource reference.
- `application resource configuration`: persisted platform-owned configuration for one `resource slot`, including selected `resourceRef` and launch defaults such as model/runtime/workspace values when supported, without creating a run immediately.
- `pre-entry configuration gate`: the host-managed setup step that happens before an app becomes actionable, typically by showing the familiar agent/team-style configuration form prefilled from saved values.

## Design Reading Order

Read and write this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Architecture Review Rework Coverage

| Finding ID | Rework Applied | Authoritative Design Sections |
| --- | --- | --- |
| `AOR-DI-001` | Added an explicit restart recovery spine, startup owner, authoritative-vs-derived store split, eager recovery policy, lookup-index rebuild rules, and dispatch-resume ordering | `DS-007`, `Restart Recovery / Resume Contract`, `Ownership Map`, `Boundary Encapsulation Map`, `Migration / Refactor Sequence` |
| `AOR-DI-002` | Defined a shared orchestration-facing lifecycle event shape, service-level observation methods on both execution owners, exact manager/service extension points, and a single orchestration-side lifecycle gateway | `Lifecycle Observation Contract`, `Existing Capability / Subsystem Reuse Check`, `Draft File Responsibility Mapping`, `Final File Responsibility Mapping`, `Interface Boundary Mapping` |
| `AOR-DI-003` | Collapsed artifact publication and lifecycle-event journaling behind one owner: `ApplicationExecutionEventIngressService`; removed split authority from the orchestration host | `Data-Flow Spine Inventory`, `Ownership Map`, `Thin Entry Facades`, `Execution Event Ingress Authority`, `Dependency Rules`, `Boundary Encapsulation Map` |
| `AOR-DI-004` | Added an explicit startup-admission gate that serializes runtime-control and live artifact ingress against recovery-time lookup rebuild and observer reattachment, independent of raw `app.listen(...)` timing | `DS-007`, `Startup Coordination / Traffic Admission Contract`, `Boundary Encapsulation Map`, `Dependency Rules`, `Migration / Refactor Sequence`, `server-runtime.ts` ownership notes |
| `AOR-DI-005` | Added one explicit direct-`startRun(...)` correlation-establishment contract based on app-owned pending binding intent plus opaque `bindingIntentId`, event-envelope echo, and reconciliation lookup by intent id | `Binding-Centric Correlation Principle`, `Direct startRun(...) Correlation Establishment Contract`, `DS-002`, `Execution Event Ingress Authority`, `Interface Boundary Mapping`, `Example App Implementation Shape`, `Migration / Refactor Sequence`, `Guidance For Implementation` |

## App-Owned Business API / Schema Principle

The platform owns **hosting, routing, worker lifecycle, orchestration, and durable event delivery**.
Each application owns **its business API schema, its own generated frontend/backend business types, and the application-specific developer workflow around those artifacts**.

That means:

- the platform hosts one **virtual backend mount** per `applicationId`,
- the authoritative frontend transport hint is one hosted `backendBaseUrl` under that mount,
- the application remains free to expose GraphQL, routes, queries/commands, or a mix of those surfaces,
- the platform may offer schema-agnostic transport helpers around that mount, but those helpers must stay generic,
- the platform must not synthesize one universal business-schema layer for ticket, brief, lesson, repository, or other app-specific subjects,
- app-owned GraphQL schemas remain the app’s own GraphQL schemas,
- app-owned route/OpenAPI contracts remain the app’s own route contracts,
- app-owned shared DTO packages remain app-owned when an app prefers that model, and
- frontend type/code generation happens in the app’s own build from app-owned schema artifacts or shared app-owned contracts.

Queries/commands may remain as convenient app-facing backend surfaces, but they are not the only “real application” story in the target architecture.
GraphQL-backed and route-backed applications remain first-class.

## Application Package Failure Isolation Principle

Application package discovery/validation failures are **content failures**, not core platform-startup failures.

That means:

- bundle discovery must be **best-effort per application/package** rather than fatal-on-first-error,
- `ApplicationBundleService` should produce one authoritative `application catalog snapshot` containing both valid applications and invalid/unavailable diagnostics,
- invalid bundled or imported applications must be quarantined from active app launch, backend delivery, and runtime-control admission instead of crashing AutoByteus startup,
- diagnostics for stale paths, missing files, malformed manifests, unsupported manifest versions, and similar package problems must stay visible to the user for repair/reload/removal, and
- durable bindings/journal rows for quarantined applications must remain repairable instead of being silently discarded just because the app is currently invalid.

The platform should therefore be able to start, serve valid applications, and expose repair workflows even when some imported or bundled applications are temporarily bad.

## Quarantined Application Repair / Reload Re-entry Principle

Startup-time quarantine is not enough by itself. The design also needs one authoritative way for a repaired application to leave quarantine without forcing a full platform restart.

That means:

- the platform supports **per-application hot re-entry**, not restart-only recovery,
- `ApplicationAvailabilityService` owns app-scoped availability state transitions (`ACTIVE`, `QUARANTINED`, `REENTERING`) and the repair/reload re-entry spine,
- `ApplicationBundleService` remains the owner of targeted bundle reload/revalidation plus diagnostics, but it does **not** own orchestration re-entry,
- when a repaired app becomes valid again, the platform reruns one app-scoped recovery slice (lookup rebuild + observer reattachment/orphan resolution) before resuming backend event dispatch for that app,
- live backend/runtime-control calls for a `QUARANTINED` or `REENTERING` app see one explicit retryable availability error instead of racing recovery work, and
- runtime-originated artifact/lifecycle events for already-known bindings remain durably journaled while backend delivery is suspended so repair/reload does not lose app-owned event history.

This makes “repairable invalid app” a real system behavior instead of a startup-only promise.

## Package Registry / Catalog Snapshot / Persisted Platform State Separation Principle

Application robustness depends on separating three different persisted subjects that the old implementation still blurs together, and each subject now gets one concrete owner.

1. **Application package registry**
   - concrete owner: `ApplicationPackageRegistryService` under `application-packages`,
   - persists imported package roots plus package metadata that survive restart,
   - owns package-level diagnostics such as `missing root`, `unreadable directory`, `managed install missing`, or registry/settings mismatch, and
   - owns package import/remove/reload flows.

2. **Application catalog snapshot**
   - concrete owner: `ApplicationBundleService` under `application-bundles`,
   - is one best-effort discovery result built *from* package-root descriptors supplied by the package-registry boundary,
   - contains valid application entries plus **application-level** diagnostics only, and
   - does **not** own package-root persistence, package-level diagnostics, or durable run/event state.

3. **Persisted application platform state**
   - concrete owner: `ApplicationPlatformStateStore` under `application-storage`,
   - is per-application durable state on disk such as run bindings, event journals, and other recovery inputs,
   - is keyed by `applicationId`-derived storage layout, and
   - can outlive the current live package/catalog validity of that application.

The authoritative package-registry contract is:

```ts
type ApplicationPackageRegistrySnapshot = {
  packages: ApplicationPackageRegistryEntry[];
  diagnostics: ApplicationPackageRegistryDiagnostic[];
  refreshedAt: string;
};
```

Rules:

- `ApplicationPackageRegistryService.getRegistrySnapshot()` is the only authoritative boundary for imported package roots, package metadata, and package-level diagnostics,
- `ApplicationBundleService` consumes that registry snapshot (or the root descriptors derived from it) instead of reading `ApplicationPackageRegistryStore` / `ApplicationPackageRootSettingsStore` directly,
- missing imported package roots become package-registry diagnostics even when no application-level manifest can be parsed underneath them,
- startup availability/recovery reconciles the current application catalog snapshot against both package-registry diagnostics and persisted known application ids instead of assuming catalog membership implies the only recoverable app set,
- absence from the current catalog does **not** justify deleting persisted run/journal state or crashing startup, and
- package removal flows operate against the package-registry owner explicitly; if persisted app state still exists afterward, the affected application becomes `PERSISTED_ONLY` / `QUARANTINED` rather than silently disappearing from recovery responsibility.

## Bundle-Independent Persisted Platform State Access Principle

Recovery and journaling for already-known application bindings must not depend on current bundle validity. The current implementation still routes too many reads/writes through bundle-dependent storage preparation, which is the wrong boundary for stale or removed apps.

That means:

- `ApplicationStorageLifecycleService.ensurePlatformStatePrepared(applicationId)` remains the bundle-dependent owner for **preparing new platform/app state** for an active application,
- `ApplicationPlatformStateStore` becomes the authoritative owner for **existing platform-state access** by applicationId-derived storage layout when the caller needs to read or append durable state that already exists on disk,
- that store should expose explicit methods with distinct semantics such as:

```ts
listKnownApplicationIds()
getExistingStatePresence(applicationId)
withPreparedPlatformState(applicationId, fn)
withExistingPlatformState(applicationId, fn)
withExistingPlatformStateIfPresent(applicationId, fn)
```

- `listKnownApplicationIds()` is the authoritative bundle-independent startup inventory boundary for persisted known applications,
- `getExistingStatePresence(applicationId)` distinguishes `PRESENT` vs `ABSENT` without preparing new state or consulting bundle discovery,
- recovery, diagnostics, binding lookup rebuild, and journaling for already-bound runs depend on the `existing` methods rather than on bundle-preparation methods,
- missing DB/files on an `existing-if-present` path produce `null` / diagnostic outcomes rather than startup-fatal exceptions,
- runtime-originated artifact/lifecycle events for a quarantined app may still append immutable journal rows through `existing` platform-state access while backend delivery stays suspended, and
- only true shared-store failure (for example inability to enumerate existing app state at all or corruption of the authoritative shared lookup store) is allowed to escalate the startup gate to `FAILED`.

This keeps the authoritative boundary clean: prepare new state through storage lifecycle; recover/read already-existing state through platform-state access.

## Startup Known-Application Inventory Principle

Startup recovery needs one authoritative inventory boundary and one authoritative availability-mapping owner.

The chosen owners are:

- `ApplicationPlatformStateStore` for **bundle-independent persisted known-application inventory**, and
- `ApplicationAvailabilityService` for **startup presence classification plus final availability/admission mapping**.

The authoritative startup-presence shape is:

```ts
type ApplicationStartupPresence = 'CATALOG_ACTIVE' | 'CATALOG_QUARANTINED' | 'PERSISTED_ONLY';
```

Rules:

- `ApplicationPlatformStateStore.listKnownApplicationIds()` enumerates application ids from existing persisted platform state only; it does not consult the live bundle/catalog layer,
- `ApplicationAvailabilityService` builds the startup candidate set as the union of:
  - valid application ids from `ApplicationBundleService.getCatalogSnapshot()`,
  - quarantined application ids from application-level diagnostics, and
  - persisted known application ids from `ApplicationPlatformStateStore.listKnownApplicationIds()`,
- startup presence is classified as:
  - `CATALOG_ACTIVE` when the application is valid in the current catalog,
  - `CATALOG_QUARANTINED` when the application currently exists only as an invalid/unavailable application diagnostic, and
  - `PERSISTED_ONLY` when persisted state exists but the current catalog has no valid or invalid application entry for that application id,
- only `ApplicationAvailabilityService` may map startup presence plus recovery outcomes into final steady-state availability/admission behavior, and
- inventory-only applications remain outside ordinary app-launch admission until a later repair/reload recreates a valid catalog entry.

## Persisted Application Resource Configuration Principle

The host may still provide a generic configuration surface for application runtime resources, but that surface is no longer a run-launch modal.

That means:

- applications may declare zero, one, or many `resource slots`,
- the generic host may reuse the old team/agent launch-configuration form shape to edit one `application resource configuration`,
- that form happens as a **pre-entry configuration gate** before the business app becomes actionable,
- the simple first-cut UX may show that form on every launch, prefilled from previously saved values,
- the form should feel materially similar to the existing agent-run / agent-team-run config UX for supported fields such as resource selection, model, runtime kind, and workspace root path,
- `autoExecuteTools` may remain visible for transparency but is always rendered locked to `true` for application-mode setup,
- saving that form persists resource selection plus launch defaults for later use,
- those launch defaults may include platform-owned runtime/model/workspace values when the slot declaration supports them,
- saving that form does **not** create or launch a run,
- the app backend later reads the persisted configuration through an authoritative platform boundary before deciding whether/how to call `runtimeControl.startRun(...)`, and
- once inside the app, the main business canvas should no longer ask for those low-level setup values again.

This keeps resource setup discoverable for users without restoring the old ownership mistake where the host launches runs before the application backend applies domain logic.

## Application-Mode Tool Approval Principle

The generic application host does not own a per-tool mid-run approval loop once work has been launched from inside an application. The design should therefore choose one actionable default instead of leaving a dead approval toggle in the UI.

That means:

- application-mode runs launched from host-configured resource slots normalize to `autoExecuteTools = true`,
- the generic host resource-configuration form may hide the tool-approval field entirely or treat it as a locked-on value, but it must not present it as a user-editable decision in this ticket,
- Brief Studio and Socratic Math Teacher should teach this behavior explicitly,
- business-level review actions such as `approveBrief` / `rejectBrief` remain valid application UI because they are domain workflow, not runtime tool approval, and
- any future manual tool-approval model for application-owned orchestration would require explicit app-owned UX and is out of scope for this ticket.

## Business-First Sample Application UI Principle

The teaching apps should demonstrate how a real application UI stays focused on business workflow even when the app internally uses runtime resources.

That means:

- business actions such as `Approve`, `Reject`, `Start lesson`, or `Generate draft` may remain in the main app canvas,
- raw platform runtime wording such as `run`, `binding`, `execution history`, or bundled resource ids should not dominate the primary business surface,
- if runtime diagnostics are useful, they should move into optional advanced details / developer-focused panels,
- application catalog cards should describe the app and its setup status first, not foreground `Agent team` badges or bundle-resource ids, and
- business-facing labels should prefer domain wording such as `Generate draft` or `Draft history` over low-level platform wording such as `Launch draft run` or `Execution history`.

## Authoritative Resource-Slot Declaration / Validation Principle

Persisted resource configuration only stays safe if one authoritative declaration contract tells the host and the backend what each configurable slot means.

The chosen contract is:

```ts
type ApplicationResourceSlotDeclaration = {
  slotKey: string;
  name: string;
  description?: string | null;
  allowedResourceKinds: ApplicationRuntimeResourceKind[];
  allowedResourceOwners?: ApplicationRuntimeResourceOwner[] | null;
  required?: boolean | null;
  supportedLaunchDefaults?: {
    llmModelIdentifier?: boolean | null;
    runtimeKind?: boolean | null;
    workspaceRootPath?: boolean | null;
  } | null;
  defaultResourceRef?: ApplicationRuntimeResourceRef | null;
};

type ApplicationManifestV3 = {
  // existing fields...
  resourceSlots?: ApplicationResourceSlotDeclaration[] | null;
};
```

Validation rules:

- `ApplicationManifestV3.resourceSlots` is the **authoritative declaration home** for host-visible slot metadata,
- `slotKey` is stable and unique within one application manifest and must match `^[A-Za-z][A-Za-z0-9_-]*$`,
- `allowedResourceKinds` is a non-empty unique list,
- `allowedResourceOwners` defaults to both `bundle` and `shared`; if present it must be a non-empty unique subset,
- `supportedLaunchDefaults` may expose only platform-owned launch fields that the generic host understands for this ticket (`llmModelIdentifier`, `runtimeKind`, `workspaceRootPath`),
- `defaultResourceRef`, when present, must satisfy the declared allowed kind/owner rules, and any bundle-local default must resolve to a discovered bundle-owned resource in that application package,
- `ApplicationBundleService` / manifest parsing owns declaration-shape validation during discovery or reload, and
- `ApplicationResourceConfigurationService` owns persisted write/read validation against that same declaration contract.

Surface rules:

- host setup reads declared slot metadata plus current saved configuration state from `ApplicationResourceConfigurationService`,
- the host uses those declarations to drive the pre-entry configuration gate before app entry,
- `upsertConfiguration(...)` rejects unknown `slotKey` values or invalid resource selections,
- `runtimeControl.getConfiguredResource(slotKey)` rejects unknown `slotKey` values and returns `null` only when the slot is declared but currently unconfigured, and
- none of these surfaces creates a run or implies launch-now behavior.

This gives the host one real configuration contract without centralizing application business meaning.

## Binding-Centric Correlation Principle

The platform’s required durable correlation concept is **`bindingId`**, not a generic app-business reference field.

That means:

- `runtimeControl.startRun(...)` returns a durable binding summary that includes `bindingId`, `bindingIntentId`, and concrete run identity,
- runtime-originated events route and recover by `bindingId` + `runId`,
- direct `startRun(...)` handoff is guarded by an app-owned pending binding intent written before binding creation,
- applications keep any `ticketId` / `briefId` / `lessonId` -> `bindingId` mapping in app-owned state, and
- the platform does not need one universal business-reference column in its binding records to remain useful or restart-safe.

This keeps platform routing/recovery durable while leaving business meaning where it belongs: inside the application backend.

## Direct `startRun(...)` Correlation Establishment Contract

The authoritative contract for direct run creation is:

1. **App-owned pending intent first**
   - Before calling `runtimeControl.startRun(...)`, the application backend persists one `pending binding intent` in app-owned state.
   - That row contains:
     - `bindingIntentId`,
     - the app-owned business target (for example `briefId` or `lessonId`),
     - intent status such as `PENDING_START`, and
     - any local metadata the app needs for later reconciliation.

2. **Platform binding creation keyed by `bindingIntentId`**
   - The app calls `runtimeControl.startRun({ bindingIntentId, resourceRef, launch })`.
   - `ApplicationOrchestrationHostService` persists the created binding row together with `bindingIntentId` **before** journaling explicit `runStarted`-style lifecycle events for that binding.

3. **Immediate response + later events both echo the same intent token**
   - The returned binding summary includes `bindingId`, `bindingIntentId`, and concrete run identity.
   - Any explicit `runStarted` event or early runtime-originated artifact event for that binding also carries the same `bindingIntentId` in the immutable event envelope.

4. **App-owned finalization after response**
   - After `startRun(...)` returns, the application backend finalizes its own business-record-to-binding mapping in app-owned state by attaching the returned `bindingId` to the intended business record and marking the pending intent committed.

5. **Crash/retry reconciliation**
   - If the backend crashes after platform binding creation but before app-owned mapping commit completes, the pending intent row still exists.
   - On restart or event retry, the application resolves `bindingIntentId -> binding summary` through one authoritative platform lookup and then finalizes the mapping.

6. **No platform-side event deferral is required**
   - The platform does **not** wait for app-owned mapping commit before journaling or dispatching `runStarted` / artifact events.
   - Instead, app-owned pending intent + echoed `bindingIntentId` + at-least-once retry semantics make early delivery restart-safe and reconcilable.

This contract keeps business meaning app-owned while making the cross-boundary handoff explicit, durable, and race-safe.

## Hosted Virtual Backend Mount Contract

The authoritative hosted backend namespace is:

`/rest/applications/:applicationId/backend`

Derived surfaces under that mount are:

- `/graphql`
- `/routes/*`
- `/queries/:queryName`
- `/commands/:commandName`
- `/status`
- `/notifications` (or the transport-specific equivalent if notifications stay on WS)

Rules:

- `applicationId` in the mounted route is authoritative for application identity.
- `ApplicationRequestContext` v2 stays about request source only: `{ applicationId, launchInstanceId? }`.
- App-specific GraphQL documents, route DTOs, and mutation/query payloads stay opaque to the platform gateway.
- The app worker never opens its own HTTP server or socket listener.
- The iframe/bootstrap contract should provide one authoritative `backendBaseUrl` plus any non-derivable channel URLs such as notifications; GraphQL/routes/query/command URLs derive from that base instead of becoming parallel sources of truth.

## Application Build / Schema-Codegen Lifecycle

The target authoring/build lifecycle for one application is:

1. The application authors its own business API contract:
   - GraphQL SDL/introspection,
   - route/OpenAPI contract, or
   - shared app-owned DTO package.
2. The application generates frontend-usable client/types from that app-owned contract inside the app workspace.
3. The application builds its frontend bundle against those generated client/types.
4. The application builds its backend bundle with the matching resolver/handler implementation.
5. The packaged runnable app ships compiled frontend/backend artifacts; optional schema artifacts may be packaged for docs or tooling, but the platform runtime does not need to centralize or reinterpret them.

The platform’s role is therefore:

- host the compiled app frontend/backend,
- expose the app-scoped backend mount,
- carry request-context/runtime-control infrastructure, and
- stay out of app-specific business-schema ownership.

## Example App Upgrade Direction

The in-repo sample apps should teach two complementary “real app” patterns:

| App | Business API Teaching Goal | Proposed Primary GraphQL Surface | Orchestration Teaching Pattern |
| --- | --- | --- | --- |
| `brief-studio` | GraphQL-backed business API over durable brief records plus review workflow | Queries: `briefs`, `brief(briefId)`, `briefExecutions(briefId)`; Mutations: `createBrief`, `launchDraftRun`, `approveBrief`, `rejectBrief`, `addReviewNote` | One `briefId` may own many bindings over time in app-owned state; the app declares resource slots such as `draftingTeam`/`reviewTeam`; the host pre-entry configuration gate captures the required drafting/runtime defaults before entry; each `launchDraftRun` writes a pending binding intent before `startRun(...)`; runtime launches use `autoExecuteTools = true`; artifacts project back into the same brief record; the primary UI keeps business actions like approval/rejection but renames low-level run wording and moves raw runtime ids/details to advanced surfaces |
| `socratic-math-teacher` | GraphQL-backed lesson/session API over repeated tutor interaction | Queries: `lessons`, `lesson(lessonId)`; Mutations: `startLesson`, `askFollowUp`, `requestHint`, `closeLesson` | One `lessonId` typically owns one long-lived binding in app-owned state; the app declares one configured tutor slot such as `lessonTutorTeam`; the host pre-entry configuration gate captures the required tutor/runtime defaults before entry; `startLesson` writes a pending binding intent before creation and later mutations reuse that binding via `runtimeControl.postRunInput(...)`; runtime launches use `autoExecuteTools = true`; the primary UI stays centered on the lesson conversation while runtime ids/details remain secondary |

Rules for those samples:

- their UI should use generated app-owned GraphQL clients as the primary business API path,
- their backend GraphQL resolvers should remain the owner of `runtimeControl` usage,
- their app package metadata should declare app-configurable resource slots so the generic host has a persisted setup surface,
- Brief Studio should teach the “many runs over one business record” pattern,
- Socratic Math Teacher should teach the “one long-lived conversational binding with repeated follow-up input” pattern, and
- both apps should rely on the pre-entry host configuration gate for runtime/model/workspace setup instead of surfacing those choices inside the app canvases.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Decision rule: the design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches kept only for old behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Browser application route | Pre-entry resource configuration gate (when shown) followed by iframe app bootstrap with ready backend engine plus hosted backend mount descriptor | `ApplicationHostLaunchOwner` | Separates application launch from worker-run creation while keeping runtime/model/workspace setup out of the business app canvas |
| `DS-002` | `Primary End-to-End` | Iframe app UI / app backend command | Concrete agent/team run creation plus pending-intent-backed durable binding establishment | `ApplicationOrchestrationHostService` | Main application-owned run-creation path, including the explicit direct-start correlation handshake |
| `DS-003` | `Return-Event` | Runtime-originated `publish_artifact` | App backend artifact event handler delivery | `ApplicationExecutionEventIngressService` | Routes runtime artifacts back to the correct app-owned context through one authoritative ingress boundary |
| `DS-004` | `Return-Event` | Underlying run lifecycle change | App backend lifecycle event delivery | `ApplicationRunObserverService` | Keeps binding state and app event history correct when runs end, fail, or are superseded |
| `DS-005` | `Bounded Local` | Per-application event journal | Event-handler ack / retry loop | `ApplicationExecutionEventDispatchService` | Preserves ordered at-least-once app-event delivery |
| `DS-006` | `Bounded Local` | Worker-side `runtimeControl` call | Host-side orchestration response | `ApplicationRuntimeControlBridge` | Makes app-owned orchestration available inside the backend worker without boundary bypass |
| `DS-007` | `Primary End-to-End` | Server startup | Orchestration gate released with a best-effort app catalog snapshot, quarantined invalid apps, recovered valid bindings, rebuilt lookup index, reattached observers, and dispatch resumed | `ApplicationOrchestrationStartupGate` | Makes restart-safe ownership real without letting one bad app/package become a fatal platform-startup dependency |
| `DS-008` | `Primary End-to-End` | Iframe app business request | App-owned business result returned through the hosted backend mount | `ApplicationBackendGatewayService` | Keeps platform transport generic while each application owns its own GraphQL/routes/query schema and generated clients |
| `DS-009` | `Primary End-to-End` | Browser host launch/settings setup | Persisted application resource configuration collected before app entry and available for later app-owned runtime orchestration | `ApplicationResourceConfigurationService` | Preserves a strong user configuration surface without collapsing setup back into run launch or leaking runtime knobs into the app canvas |
| `DS-010` | `Primary End-to-End` | Host repair/reload action for one quarantined app | App leaves quarantine through app-scoped re-entry, recovery slice rerun, and dispatch resume without full platform restart | `ApplicationAvailabilityService` | Makes invalid-app repairability actionable instead of startup-only |
| `DS-011` | `Bounded Local` | Known `applicationId` from the current catalog or persisted state inventory | Existing platform DB opened/read/appended by storage-layout-derived identity without bundle preparation, or a null/diagnostic outcome when no persisted state exists | `ApplicationPlatformStateStore` | Decouples stale-app recovery/journaling from live bundle validity so one missing app package cannot poison global startup |
| `DS-012` | `Primary End-to-End` | Host package import/remove/reload action | Package-registry snapshot refreshed, package-level diagnostics updated, bundle catalog rederived, and affected app availability refreshed without restart | `ApplicationPackageRegistryService` | Makes imported package roots and package-level diagnostics one concrete persisted subject instead of a conceptual split across stores and discovery internals |

## Primary Execution Spine(s)

- `DS-001`: `Browser Route -> ApplicationShell / ApplicationHostStore -> Pre-entry Resource Configuration Gate (prefilled from saved values) -> ApplicationBackendGateway ensure-ready -> ApplicationEngineHost -> ApplicationSurface -> Iframe App with backend mount descriptor`
- `DS-002`: `Iframe App UI -> App Backend Gateway -> ApplicationEngine Worker -> App Backend Handler -> Pending Binding Intent Commit -> runtimeControl Bridge -> ApplicationOrchestrationHostService -> AgentRunService / TeamRunService -> Binding Summary -> App Mapping Finalization`
- `DS-007`: `Server Startup -> ApplicationBundleService catalog snapshot -> ApplicationOrchestrationStartupGate -> ApplicationOrchestrationRecoveryService -> ApplicationRunBindingStore -> ApplicationRunLookupStore rebuild -> ApplicationBoundRunLifecycleGateway -> ApplicationRunObserverService -> ApplicationExecutionEventDispatchService resume -> StartupGate READY`
- `DS-008`: `Iframe App UI / generated client -> ApplicationBackendGateway virtual mount -> ApplicationEngineHost -> App Backend Handler -> App-Owned Business Result`
- `DS-009`: `Browser Host Launch / Settings -> ApplicationResourceConfigurationService -> ApplicationResourceConfigurationStore -> runtimeControl.getConfiguredResource(...) -> App Backend Handler -> Later startRun decision`
- `DS-010`: `Host Repair/Reload Action -> ApplicationAvailabilityService -> ApplicationBundleService.reloadApplication(applicationId) -> ApplicationOrchestrationRecoveryService.resumeApplication(applicationId) -> ApplicationExecutionEventDispatchService.resumePendingEventsForApplication(applicationId) -> Availability ACTIVE`
- `DS-011`: `Known Application ID -> ApplicationPlatformStateStore existing-state access -> Binding/Journal Store -> Recovery/Ingress/Dispatch Caller -> recovered rows or null/diagnostic outcome`
- `DS-012`: `Host Package Action -> ApplicationPackageRegistryService -> Package Registry Snapshot -> ApplicationBundleService catalog refresh -> ApplicationAvailabilityService synchronization -> Updated package/app diagnostics surfaces`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Opening an application page first passes through one host-managed pre-entry configuration gate for any declared resource-slot setup the host chooses to collect or confirm. The simple first-cut behavior may show that form on every launch, prefilled from saved values. After confirmation, the host ensures the backend worker is ready and boots the iframe without creating a run. The browser launch is now “application available” rather than “run already created,” and the iframe receives one authoritative backend mount descriptor instead of session-owned runtime identity. | `ApplicationShell`, `ApplicationHostStore`, `ApplicationResourceConfigurationService`, `ApplicationBackendGateway`, `ApplicationEngineHost`, `ApplicationSurface` | `ApplicationHostLaunchOwner` in the web host, backed by `ApplicationEngineHostService` | pre-entry setup gate, iframe launch descriptor, backend ensure-ready endpoint, bootstrap contract v2, backend mount transport descriptor |
| `DS-002` | The app UI calls its own backend. The app backend first commits one pending binding intent with `bindingIntentId`, then calls the worker-side `runtimeControl`. The orchestration host resolves the resource, creates the run, persists the binding together with `bindingIntentId`, attaches lifecycle observation, and returns a binding summary. The app backend then finalizes business-record-to-binding mapping in app-owned state; if that finalization fails, later reconciliation uses `bindingIntentId` plus retry-safe event delivery to finish the handoff. | `App Backend Handler`, `Pending Binding Intent`, `ApplicationRuntimeControlBridge`, `ApplicationOrchestrationHostService`, `AgentRunService/TeamRunService`, `ApplicationRunObserverService` | `ApplicationOrchestrationHostService` for platform binding creation, plus `ApplicationBackend` for app-owned finalization | resource resolution, binding store, derived lookup index, lifecycle gateway, execution-event ingress, app-owned binding mapping, intent reconciliation |
| `DS-003` | A bound runtime publishes an artifact. The platform uses injected execution context to resolve the binding, appends a normalized immutable event journal row through the execution-event ingress owner, and dispatches the event into the app backend. The application backend then projects that event into business state. | `publish_artifact`, `ApplicationExecutionEventIngressService`, `ApplicationExecutionEventDispatchService`, `ApplicationEngineHost`, `App Event Handler` | `ApplicationExecutionEventIngressService` | derived lookup index, binding store, retry policy, producer provenance extraction |
| `DS-004` | When a run terminates, fails, or is superseded, the run observer receives a normalized lifecycle signal through the lifecycle gateway, updates the binding, records the lifecycle event through the execution-event ingress owner, and relies on the dispatch loop to deliver that event back into the app backend. | `ApplicationBoundRunLifecycleGateway`, `ApplicationRunObserverService`, `ApplicationRunBindingStore`, `ApplicationExecutionEventIngressService`, `Dispatch Service` | `ApplicationRunObserverService` | lifecycle gateway adapter, derived lookup index maintenance, immutable event ingress |
| `DS-005` | For each application, the journal drains in order, calls the app event handler through the engine boundary, and retries with backoff until acknowledged. | `Event Journal`, `Dispatch Loop`, `ApplicationEngineHost` | `ApplicationExecutionEventDispatchService` | retry timer, ack cursor, startup resume hook |
| `DS-006` | Inside the worker, app backend code sees one authoritative `runtimeControl` API instead of raw host services. Calls cross the worker/host bridge and land in the orchestration owner. | `ApplicationHandlerContext.runtimeControl`, `ApplicationRuntimeControlClient`, `ApplicationRuntimeControlHost`, `ApplicationOrchestrationHostService` | `ApplicationRuntimeControlBridge` | IPC protocol messages, request/response normalization |
| `DS-007` | On server startup, `server-runtime` first asks `ApplicationPackageRegistryService` for one registry snapshot containing package-root descriptors plus package-level diagnostics. `ApplicationBundleService` then derives one best-effort application catalog snapshot from that registry snapshot. `ApplicationPlatformStateStore.listKnownApplicationIds()` provides the bundle-independent persisted known-app inventory, and `ApplicationAvailabilityService` reconciles those three inputs into startup presence. The orchestration startup gate opens one exclusive recovery window. While that gate remains closed, live runtime-control calls and runtime-originated artifact publications cannot proceed. Inside that window, orchestration recovery uses bundle-independent existing-platform-state access to rebuild lookup rows and reattach observers for every recoverable binding, quarantines per-app failures instead of crashing the platform, keeps journaling available for already-bound runs even when the app is quarantined, resumes backend event dispatch only for active apps, and only then releases the gate to steady-state ready. | `ServerRuntime`, `ApplicationPackageRegistryService`, `ApplicationBundleService`, `ApplicationPlatformStateStore`, `ApplicationAvailabilityService`, `ApplicationOrchestrationStartupGate`, `ApplicationOrchestrationRecoveryService`, `ApplicationRunBindingStore`, `ApplicationRunLookupStore`, `ApplicationBoundRunLifecycleGateway`, `ApplicationRunObserverService`, `ApplicationExecutionEventIngressService`, `ApplicationExecutionEventDispatchService` | `ApplicationOrchestrationStartupGate` | package-registry snapshot, application catalog snapshot, persisted known-app inventory, app availability state, bundle-independent existing-state access, observer registration, recovery failure marking |
| `DS-008` | The iframe calls one application-owned business API surface through the hosted backend mount, typically through an app-generated GraphQL or route client. The backend gateway routes by `applicationId`, ensures the worker is ready, checks app availability, forwards the request into the app backend handler, and returns an application-defined result. The platform owns transport and hosting; the application owns the business schema of that request and response. | `Iframe App`, `ApplicationBackendGatewayService`, `ApplicationAvailabilityService`, `ApplicationEngineHostService`, `App Backend Handler` | `ApplicationBackendGatewayService` | app-owned schema artifacts, generated frontend client/types, backend mount transport descriptor, request-context normalization |
| `DS-009` | The browser host opens an application resource-configuration surface, often reusing the old team/agent launch form shape, before the app becomes actionable. The simple first-cut behavior may show this gate on every launch, prefilled from saved values. The host reads manifest-declared `resource slot declarations`, lets the user choose a resource plus supported launch defaults such as model/runtime/workspace when declared, shows `autoExecuteTools` as locked-on `true` for transparency, persists that configuration without starting a run, and later the app backend reads the saved configuration through the authoritative platform boundary before deciding how to start or reuse work. | `Browser Host`, `ApplicationResourceConfigurationService`, `ApplicationBundleService`, `ApplicationResourceConfigurationStore`, `ApplicationBackend` | `ApplicationResourceConfigurationService` | manifest-declared slot metadata, pre-entry setup gate, persisted resource setup, runtimeControl readback, transparent locked-on tool approval |
| `DS-010` | When a previously quarantined application is repaired or reloaded, the host triggers one app-scoped re-entry flow. `ApplicationAvailabilityService` asks `ApplicationBundleService` to reload and revalidate that app, clears any application-level diagnostics that no longer apply, transitions availability to `REENTERING` when the package becomes valid, reruns the app-scoped recovery slice using existing persisted platform state plus fresh catalog metadata, resumes pending journal delivery for that app, and finally returns the app to `ACTIVE`. If validation or re-entry fails, the app remains `QUARANTINED` with updated diagnostics instead of affecting other apps. Package-root repair/removal itself remains owned by `ApplicationPackageRegistryService`; app re-entry remains owned by `ApplicationAvailabilityService`. | `Browser Host`, `ApplicationAvailabilityService`, `ApplicationBundleService`, `ApplicationOrchestrationRecoveryService`, `ApplicationPlatformStateStore`, `ApplicationExecutionEventDispatchService`, `ApplicationRunLookupStore`, `ApplicationRunObserverService` | `ApplicationAvailabilityService` | app-scoped availability state, reload diagnostics, persisted-state reconciliation, recovery-slice rerun, dispatch-resume gating |
| `DS-011` | Given one application id, `ApplicationPlatformStateStore` first exposes whether existing persisted platform state is present and whether that id belongs to the persisted known-app inventory. Callers then choose explicit semantics: prepare new state for active-app launch, open required existing state for already-bound recovery/journaling, or probe optional existing state for diagnostics. The owner never requires manifest/bundle revalidation just to read durable state that is already on disk. | `ApplicationPlatformStateStore`, `ApplicationStorageLifecycleService`, `ApplicationRunBindingStore`, `ApplicationExecutionEventJournalStore`, `ApplicationExecutionEventIngressService` | `ApplicationPlatformStateStore` | known-app inventory, storage-layout derivation, existing-db detection, prepared-vs-existing access semantics, null/diagnostic outcome normalization |
| `DS-012` | When the host imports, reloads, or removes one application package source, the package-registry owner persists the root/metadata change, refreshes the registry snapshot, exposes package-level diagnostics, asks bundle discovery to rebuild the application catalog from the new registry snapshot, and then lets availability/orchestration owners react to the changed app set. Package-registry flows do not themselves rerun app-scoped orchestration recovery. | `Browser Host`, `ApplicationPackageRegistryService`, `ApplicationPackageRegistryStore`, `ApplicationPackageRootSettingsStore`, `ApplicationBundleService`, `ApplicationAvailabilityService` | `ApplicationPackageRegistryService` | package-root persistence, package diagnostics, package reload/remove semantics, downstream catalog refresh coordination |

## Spine Actors / Main-Line Nodes

- `ApplicationHostLaunchOwner` (web host side)
- `ApplicationPackageRegistryService`
- `ApplicationBundleService`
- `ApplicationBackendGatewayService`
- `ApplicationEngineHostService`
- `ApplicationBackend` (worker-side app definition handlers)
- `ApplicationRuntimeControlBridge`
- `ApplicationAvailabilityService`
- `ApplicationPlatformStateStore`
- `ApplicationOrchestrationStartupGate`
- `ApplicationOrchestrationHostService`
- `ApplicationBoundRunLifecycleGateway`
- `ApplicationRunObserverService`
- `ApplicationExecutionEventIngressService`
- `ApplicationExecutionEventDispatchService`
- `ApplicationOrchestrationRecoveryService`
- `ApplicationResourceConfigurationService`
- `AgentRunService`
- `TeamRunService`

## Ownership Map

- `ApplicationHostLaunchOwner`
  - owns browser launch readiness for the generic host
  - owns the pre-entry configuration gate shown before app entry
  - owns the familiar team/agent-style host form presentation before iframe entry
  - owns iframe launch descriptor and `launchInstanceId`
  - does **not** own worker-run creation policy

- `ApplicationPackageRegistryService`
  - owns persisted imported package roots plus package metadata and package-level diagnostics
  - owns package import/remove/reload flows and the authoritative package-registry snapshot
  - is the only boundary allowed to coordinate `ApplicationPackageRegistryStore` plus `ApplicationPackageRootSettingsStore`
  - does **not** own application manifest parsing, app-level catalog entries, or orchestration re-entry

- `ApplicationBundleService`
  - owns the authoritative application catalog snapshot of valid apps plus application-level diagnostics
  - consumes package-root descriptors from `ApplicationPackageRegistryService` instead of reading package-root stores directly
  - owns manifest-level parsing/validation of `resourceSlots` and targeted app/application reload/revalidation hooks
  - does **not** own package-root persistence, package-level diagnostics, run bindings, runtime control, or post-validation orchestration re-entry

- `ApplicationBackendGatewayService`
  - owns the authoritative hosted backend mount under `applicationId`
  - owns transport normalization across GraphQL, routes, queries, and commands
  - validates request-context identity
  - treats app business payloads as opaque transport payloads
  - does **not** own app business schema/codegen, orchestration policy, or worker internals

- `ApplicationEngineHostService`
  - owns backend worker lifecycle for one application
  - owns worker startup, ready status, IPC client, and worker invocation
  - does **not** own application business orchestration

- `ApplicationBackend`
  - owns domain logic, business-state projection, orchestration policy decisions, and the application’s business API schema/resolver contract
  - owns pending binding intent persistence plus business-record-to-`bindingId` mapping in app state
  - decides when to start/stop work, which `bindingIntentId` to create, and which returned binding should attach to which business record
  - owns whether the app frontend talks through GraphQL, routes, queries/commands, or a mix of those surfaces

- `ApplicationRuntimeControlBridge`
  - is a thin worker-facing boundary that exposes one authoritative platform API into the worker
  - does **not** own orchestration state itself

- `ApplicationAvailabilityService`
  - owns the app-scoped availability state machine (`ACTIVE`, `QUARANTINED`, `REENTERING`) after startup
  - owns the authoritative repair/reload re-entry flow that coordinates bundle reload success with app-scoped recovery rerun and dispatch resume
  - does **not** own manifest parsing, binding persistence, or app business projection

- `ApplicationPlatformStateStore`
  - owns bundle-independent access to already-existing per-app platform DB state by storage layout
  - owns the authoritative persisted known-application inventory through `listKnownApplicationIds()` plus `getExistingStatePresence(applicationId)`
  - distinguishes `prepared` active-app state creation from `existing` recovery/journaling access
  - does **not** own package diagnostics, app availability policy, or run-binding orchestration

- `ApplicationResourceConfigurationService`
  - owns persisted host-managed configuration for app-declared `resource slots`
  - validates writes and host/runtime readback against authoritative manifest-declared `resource slot declarations`
  - owns the saved/pre-filled values used by the pre-entry configuration gate
  - keeps `autoExecuteTools` visible-but-locked at `true` for the generic host-managed setup flow
  - exposes host-facing read/write behavior plus app/backend-readable configuration through the authoritative platform boundary
  - does **not** own business-domain meaning or immediate run creation

- `ApplicationOrchestrationStartupGate`
  - owns the authoritative startup-readiness state for orchestration-sensitive live traffic
  - serializes recovery-time lookup rebuild / observer reattachment against live `runtimeControl` calls and live runtime-originated artifact publications
  - does **not** own recovery logic, binding persistence, or event normalization

- `ApplicationOrchestrationHostService`
  - owns resource resolution, run binding persistence, control/query behavior, lifecycle-observer attachment on new bindings, explicit runtime control operations, and persistence of opaque `bindingIntentId` on newly created bindings
  - does **not** own app business-record mapping, mapping finalization, or execution-event journaling

- `ApplicationBoundRunLifecycleGateway`
  - is the thin adapter boundary that converts agent-run and team-run lifecycle notifications into one orchestration-facing lifecycle shape
  - does **not** own binding state or event journaling

- `ApplicationRunObserverService`
  - owns ongoing observer attachment/reattachment for bound runs and the binding-state transitions triggered by observed lifecycle changes
  - does **not** own concrete run creation or event journaling APIs

- `ApplicationExecutionEventIngressService`
  - owns the **single authoritative ingress boundary** for all runtime execution events that become app-backend events
  - accepts artifact publications and platform-originated run lifecycle events
  - keeps journaling available for known bindings even when an application is `QUARANTINED` or `REENTERING`; only backend delivery is suspended
  - normalizes event envelopes and appends immutable journal rows
  - does **not** own dispatch retries or business projection

- `ApplicationExecutionEventDispatchService`
  - owns ordered at-least-once delivery of normalized runtime events into the app backend
  - owns app-scoped dispatch suspension/resume behavior based on `ApplicationAvailabilityService` state
  - does **not** own event normalization or binding state

- `ApplicationOrchestrationRecoveryService`
  - owns startup recovery/resume of durable bindings, derived lookup reconstruction, and eager observer reattachment **inside** the startup gate’s exclusive recovery window
  - does **not** own ordinary runtime control calls after startup recovery completes

- `AgentRunService` / `TeamRunService`
  - own concrete execution-resource creation, resolution, restore, termination, input delivery, and a service-level lifecycle-observation boundary for their own subject
  - do **not** own application binding or application business context

If a public facade or entry wrapper exists, it is thin unless explicitly listed above as a governing owner.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `ApplicationHandlerContext.runtimeControl` | `ApplicationOrchestrationHostService` | Safe worker-facing API for app backends | binding persistence internals, event journaling, or direct run-service access |
| `publish_artifact` tool | `ApplicationExecutionEventIngressService` | Runtime tool entrypoint for artifact publication; must wait on the startup gate before forwarding live artifact traffic | app-owned business projection or dispatch retries |
| `ApplicationBoundRunLifecycleGateway` | `AgentRunService.observeAgentRunLifecycle(...)` / `TeamRunService.observeTeamRunLifecycle(...)` | One orchestration-facing lifecycle shape over two execution owners | binding updates or app event journaling |
| `ApplicationBackendGatewayService` GraphQL/routes/query/command entrypoints | `ApplicationEngineHostService` and app backend handlers | Host the app-scoped virtual backend mount, normalize transport, and validate application identity | orchestration policy, app business schema ownership, or session-like state |
| `ApplicationSurface.vue` / iframe bridge | `ApplicationHostLaunchOwner` | Browser-side iframe launch/bootstrap boundary | worker-run creation or app domain state |
| `ApplicationResourceConfigurationModal.vue` / settings entry | `ApplicationResourceConfigurationService` | Reuse the old launch-form UX shape for persisted resource setup | immediate run launch or app business projection |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions/**` | Session is no longer the governing orchestration owner | `src/application-orchestration/**` plus engine-first launch | `In This Change` | Clean-cut replacement |
| `runtimeTarget` from application catalog + manifest v2 | Applications no longer have one singular launch-time worker identity | Manifest v3 without `runtimeTarget`; orchestration uses resource refs | `In This Change` | Required for clean ownership |
| fatal-on-first-invalid application bundle cache population | One invalid imported/bundled app must not crash the whole platform startup path | best-effort `application catalog snapshot` + diagnostics quarantine | `In This Change` | Required for startup robustness |
| `createApplicationSession`, `terminateApplicationSession`, `applicationSessionBinding`, session GraphQL types | Generic host no longer launches/binds applications through durable sessions | app launch uses engine ensure-ready; app backend owns run control | `In This Change` | Remove GraphQL session boundary entirely |
| Application-session websocket streaming and retained snapshot transport | Platform no longer owns app-visible retained execution view | app-owned state projection + app notifications; optional runtime identity exposure only | `In This Change` | Session stream URL removed from iframe bootstrap |
| `ApplicationLaunchConfigModal.vue` run-launch semantics and host launch-draft preparation | Generic host should not own low-level run launch configuration or create runs during setup | `ApplicationResourceConfigurationModal.vue` + `ApplicationResourceConfigurationService` for persisted setup; app-owned UI/backend still decides when and how runs are launched | `In This Change` | Reuse useful form UX while removing old launch-now meaning |
| `ApplicationExecutionWorkspace.vue` host-retained artifact view | Platform should not remain the primary owner of app-visible runtime artifact projection | app UI + app backend projection + optional workspace handoff | `In This Change` | Deep-link capability remains via runtime identity |
| `applicationSessionContext` injection key and session-based publication routing | Publications must route by execution/binding context | `applicationExecutionContext` / run binding context | `In This Change` | Tool entrypoint survives; context owner changes |
| Brief Studio `briefId = brief::<applicationSessionId>` | Business identity must stop deriving from platform session identity | app-owned `briefId` + app-owned `briefId -> bindingId[]` mapping | `In This Change` | Teaching sample must teach target model |
| Brief Studio query/command-heavy canonical UI flow and Socratic Math Teacher minimal bootstrap-only positioning | They keep teaching an underpowered app-business-API model after the platform moves to app-owned schemas and virtual backend mounts | GraphQL-backed real sample apps with generated clients and app-owned resolver flows | `In This Change` | Sample docs/builds should teach the new model, not the historical one |

## Return Or Event Spine(s) (If Applicable)

- `DS-003`: `Runtime -> publish_artifact -> ApplicationExecutionEventIngressService -> Execution Event Journal -> ApplicationExecutionEventDispatchService -> ApplicationEngineHost -> App Event Handler`
- `DS-004`: `Lifecycle Gateway -> ApplicationRunObserverService -> ApplicationExecutionEventIngressService -> Execution Event Journal -> Dispatch Service -> ApplicationEngineHost -> App Event Handler`

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationExecutionEventDispatchService`
  - arrow chain: `Pending Journal Row -> Dispatch Attempt -> App Event Handler Invocation -> Ack / Failure Record -> Retry Timer`
  - why this bounded local spine matters: delivery ordering, retry policy, and startup resume behavior are core guarantees of the platform-owned event-delivery model

- Parent owner: `ApplicationRuntimeControlBridge`
  - arrow chain: `Worker runtimeControl call -> IPC request -> Host bridge dispatcher -> ApplicationOrchestrationHostService -> IPC response`
  - why this bounded local spine matters: it makes application-owned orchestration available inside the worker without letting the worker depend on host internals directly

- Parent owner: `ApplicationOrchestrationRecoveryService`
  - arrow chain: `Catalog Snapshot + Known App IDs -> Read Durable State -> Rebuild Lookup Index -> Restore/Resolve Run / Quarantine Invalid App -> Attach Observer / Suspend / Mark Orphaned`
  - why this bounded local spine matters: restart-safe ownership is not real unless recovery explicitly rebuilds runtime-facing state from durable stores

## Restart Recovery / Resume Contract

### Authoritative storage choice

- `ApplicationRunBindingStore` is the **authoritative** durable source for orchestration state.
- Each application keeps its own binding rows in its per-app platform-owned DB.
- `ApplicationRunLookupStore` is a **derived acceleration index**, not the source of truth.
- The global lookup index exists only to resolve `runId -> applicationId + bindingId` efficiently for runtime-originated events.

### Startup owner and hook

- `ApplicationOrchestrationRecoveryService.resumeBindings()` is the authoritative startup recovery owner.
- `ApplicationAvailabilityService` is the authoritative owner of post-startup app availability state and later repair/reload re-entry.
- `ApplicationBundleService.refreshCatalog()` (or equivalent cache-refresh entrypoint) must first build one best-effort `application catalog snapshot` that separates valid applications from invalid/unavailable diagnostics.
- `server-runtime.ts` enters `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` after catalog snapshot availability and temp-workspace readiness are established.
- Inside that exclusive startup gate callback, `server-runtime.ts` calls `ApplicationOrchestrationRecoveryService.resumeBindings()` first and `ApplicationExecutionEventDispatchService.resumePendingEvents()` second.

### Recovery policy

- Recovery is **eager for every nonterminal binding**.
- The system does **not** wait for first user interaction to reattach observers.
- Rationale: publication and lifecycle guarantees cannot be claimed if bound runs can publish/terminate before observer attachment exists.

### Recovery algorithm

For each application id represented either in the valid catalog snapshot, the binding store, or the pending-event journal:

1. consult the authoritative catalog snapshot,
2. read all nonterminal bindings from `ApplicationRunBindingStore` for that application,
3. clear and rebuild that application's rows in the derived global `ApplicationRunLookupStore`,
4. for each nonterminal binding:
   - call the lifecycle gateway, which resolves/restores the concrete run through the correct execution service,
   - if restoration succeeds, attach the observer immediately and mark the binding `attached`,
   - if restoration fails because the run itself is not recoverable, mark the binding `orphaned`, remove its lookup row, and record a lifecycle event through `ApplicationExecutionEventIngressService`,
5. if the application is invalid/unavailable in the catalog snapshot, mark its availability state `QUARANTINED` for steady state:
   - keep diagnostics visible,
   - keep rebuilt lookup rows and attached observers for recoverable bindings so runtime-originated events can still be journaled durably,
   - suspend backend worker launch, `runtimeControl`, and backend event dispatch for that application until repair/reload re-entry succeeds,
6. if the application is valid, mark its availability state `ACTIVE` and include it in steady-state dispatch resume.

### Guarantees

- After recovery completes, every nonterminal recoverable binding for every known application has:
  - a rebuilt lookup row,
  - an attached lifecycle observer when the concrete run can still be restored, and
  - a known current binding state.
- Any binding that cannot be recovered because the concrete run is gone is explicitly transitioned to `orphaned`; it is **not** silently left as “active but unattached.”
- A quarantined invalid application does **not** crash startup, and it does **not** lose already-known binding/event durability; only backend launch, runtime control, and backend event delivery are suspended.

### Dispatch ordering at startup

1. `ApplicationBundleService.refreshCatalog()` produces a best-effort catalog snapshot
2. `ApplicationOrchestrationStartupGate.runStartupRecovery(...)`
3. inside it: `ApplicationOrchestrationRecoveryService.resumeBindings()`
4. inside it: `ApplicationExecutionEventDispatchService.resumePendingEvents()` (which resumes only `ACTIVE` applications and leaves `QUARANTINED` ones suspended)
5. release startup gate to `READY`

This ordering ensures that:

- recovery-generated lifecycle/orphan events are already journaled before dispatch resumes,
- lookup/index state is valid before live runtime-originated publications are admitted,
- invalid applications are already marked `QUARANTINED` before steady-state orchestration readiness is claimed, and
- observer attachment is in place before the startup gate releases steady-state orchestration readiness.

## Quarantine Exit / Repair-Reload Re-entry Contract

### Chosen model

- The platform supports **per-application hot re-entry** after repair or reload.
- It does **not** require a full AutoByteus restart just because one application package becomes valid again.

### Governing owner

- `ApplicationAvailabilityService` is the authoritative owner of this spine.
- `ApplicationBundleService.reloadApplication(applicationId)` only revalidates one app/package and updates the catalog snapshot/diagnostics.
- `ApplicationOrchestrationRecoveryService.resumeApplication(applicationId)` reruns the app-scoped recovery slice.
- `ApplicationExecutionEventDispatchService.resumePendingEventsForApplication(applicationId)` resumes backend delivery only after recovery re-entry succeeds.

### App-scoped availability states

- `ACTIVE`: app backend launch, `runtimeControl`, and backend event delivery are admitted.
- `QUARANTINED`: diagnostics are visible; known bindings/events remain durable; backend launch, `runtimeControl`, and backend event delivery are suspended.
- `REENTERING`: the package has become valid again, but the app-scoped recovery slice and dispatch resume are still in progress.

### Re-entry algorithm

1. a repair/reload action targets one application id,
2. `ApplicationAvailabilityService.reloadAndReenter(applicationId)` calls `ApplicationBundleService.reloadApplication(applicationId)`,
3. if the app is still invalid, keep it `QUARANTINED` with updated diagnostics and stop,
4. if the app becomes valid, transition it to `REENTERING`,
5. rerun `ApplicationOrchestrationRecoveryService.resumeApplication(applicationId)` to rebuild lookup rows, reassert observers, and mark newly orphaned bindings if needed,
6. run `ApplicationExecutionEventDispatchService.resumePendingEventsForApplication(applicationId)` to drain the app's accumulated journal rows into the repaired backend,
7. if both succeed, clear quarantine state and transition the app to `ACTIVE`,
8. if either fails, transition back to `QUARANTINED` and append/update diagnostics describing the failed re-entry attempt.

### Live-traffic behavior during re-entry

- `ApplicationBackendGatewayService` returns an explicit retryable app-unavailable/app-reloading error for `QUARANTINED` or `REENTERING` apps instead of starting the worker anyway.
- `ApplicationOrchestrationHostService` / worker `runtimeControl` return the same retryable availability error for those apps.
- `ApplicationExecutionEventIngressService` continues to journal runtime-originated events for known bindings while the app is `QUARANTINED` or `REENTERING`; it does **not** deliver them into the app backend until the app returns to `ACTIVE`.
- `ApplicationExecutionEventDispatchService` suspends dispatch attempts for non-`ACTIVE` apps and resumes them only through the authoritative re-entry owner.

This turns “repair/reload should work” into one explicit platform contract.

## Startup Coordination / Traffic Admission Contract

### Chosen coordination model

- The design chooses an explicit **startup gate / serialization boundary**, not correctness-by-raw-`app.listen(...)` ordering.
- `app.listen(...)` may still occur before some startup work completes if the runtime needs the bound address for internal URL seeding or other non-orchestration bootstrapping.
- The authoritative correctness rule is therefore: **orchestration-sensitive live traffic is not admitted until the startup gate releases**.

### Authoritative boundary

- `ApplicationOrchestrationStartupGate` is the single owner of orchestration startup readiness.
- It exposes one exclusive recovery window plus one shared ready-wait for live callers.
- It has three states:
  - `RECOVERING`
  - `READY`
  - `FAILED`

### Exclusive startup window

- `server-runtime.ts` enters the gate before orchestration recovery begins.
- The gate runs one exclusive startup callback of this shape:

  `runStartupRecovery(async () => { await ApplicationOrchestrationRecoveryService.resumeBindings(); await ApplicationExecutionEventDispatchService.resumePendingEvents(); })`

- While that callback is active:
  - lookup-index rebuild is allowed,
  - observer reattachment is allowed,
  - recovery-generated lifecycle/orphan events may flow into `ApplicationExecutionEventIngressService`,
  - live `runtimeControl` calls and live runtime-originated artifact publications are **not** admitted.

### Gated live paths

- `ApplicationOrchestrationHostService` must wait on `ApplicationOrchestrationStartupGate.awaitReady()` before executing any public runtime-control query or mutation that touches bindings, lookup state, or bound-run control.
- `publish_artifact` live traffic must wait on `ApplicationOrchestrationStartupGate.awaitReady()` before forwarding to `ApplicationExecutionEventIngressService`.
- Application/backend requests that do **not** touch orchestration-sensitive runtime control may proceed independently; the startup gate is not a whole-server global lock.

### Release condition

- The gate transitions to `READY` only after:
  1. the best-effort catalog snapshot is available,
  2. `ApplicationOrchestrationRecoveryService.resumeBindings()` succeeds, and
  3. `ApplicationExecutionEventDispatchService.resumePendingEvents()` succeeds.

At that point:

- the derived lookup index has been rebuilt,
- nonterminal recoverable bindings have observers attached,
- unrecoverable bindings have been orphaned explicitly,
- the dispatch loop is running again, and
- live `runtimeControl` plus live runtime-originated artifact traffic may proceed.

### Failure behavior

- If the startup callback fails because the orchestration subsystem itself is internally inconsistent or its authoritative stores cannot be recovered, the gate transitions to `FAILED`.
- Invalid application/package diagnostics alone do **not** transition the gate to `FAILED`; they produce quarantined application diagnostics instead.
- Gated live callers receive a startup-unavailable failure rather than racing with partial orchestration state.
- `server-runtime.ts` treats only true orchestration-startup failure as fatal and must not terminate just because one application package is invalid or stale.

## Per-Application Startup Recovery Outcome Contract

`ApplicationOrchestrationRecoveryService` must produce explicit per-application outcomes instead of using thrown exceptions as its normal app-failure path. The authoritative shape is conceptually:

```ts
type ApplicationRecoveryOutcome = {
  applicationId: string;
  status: 'RECOVERED' | 'QUARANTINED' | 'NO_PERSISTED_STATE';
  detail: string | null;
};
```

Contract rules:

- `resumeBindings()` iterates the reconciled known-application set and records one outcome per application,
- a missing bundle/package root, missing optional existing DB, or one app-specific recovery failure downgrades that app to `QUARANTINED` or `NO_PERSISTED_STATE` instead of throwing out of the whole startup path,
- `ApplicationAvailabilityService` is updated from those outcomes so the app's live admission state stays authoritative,
- dispatch resumes only for applications whose availability is `ACTIVE`, while quarantined apps keep durable event history but no backend delivery, and
- only global failures of the authoritative shared stores/owners (for example the startup gate itself, the global lookup store, or inability to enumerate persisted application ids at all) are allowed to escape as startup-fatal errors.

### Outcome-to-availability mapping

`ApplicationAvailabilityService.applyStartupRecoveryOutcome(...)` maps startup presence plus recovery outcome as follows:

- `CATALOG_ACTIVE + RECOVERED -> ACTIVE`
- `CATALOG_ACTIVE + NO_PERSISTED_STATE -> ACTIVE` (nothing to recover; app launch/backend admission proceed normally)
- `CATALOG_ACTIVE + QUARANTINED -> QUARANTINED`
- `CATALOG_QUARANTINED + RECOVERED -> QUARANTINED` (persisted state may still be observed/journaled, but backend/runtime-control admission stays suspended)
- `CATALOG_QUARANTINED + NO_PERSISTED_STATE -> QUARANTINED`
- `CATALOG_QUARANTINED + QUARANTINED -> QUARANTINED`
- `PERSISTED_ONLY + RECOVERED -> QUARANTINED`
- `PERSISTED_ONLY + QUARANTINED -> QUARANTINED`
- `PERSISTED_ONLY + NO_PERSISTED_STATE` is impossible by construction because `PERSISTED_ONLY` candidates originate from `ApplicationPlatformStateStore.listKnownApplicationIds()`

### Traffic-admission note

- `app.listen(...)` is **not** the authoritative readiness signal for application orchestration.
- Any readiness surface that claims the server is ready for orchestration-sensitive traffic must reflect `ApplicationOrchestrationStartupGate`, not raw socket-bind success alone.

## Lifecycle Observation Contract

### Shared orchestration-facing lifecycle shape

Introduce one shared internal lifecycle-notification shape used above the execution subsystems:

- `ObservedRunLifecycleEvent`
  - `runtimeSubject`: `AGENT_RUN` | `TEAM_RUN`
  - `runId`
  - `phase`: `ATTACHED` | `TERMINATED` | `FAILED`
  - `occurredAt`
  - optional `errorMessage`

This is intentionally narrower than rich agent/team event streams.
It exists only for orchestration ownership: attachment, terminal change, and failure change.

### Authoritative execution-owner interfaces

The orchestration subsystem depends on **service-level** observation methods, not on raw manager or backend details:

- `AgentRunService.observeAgentRunLifecycle(runId, listener)`
- `TeamRunService.observeTeamRunLifecycle(teamRunId, listener)`

These service-level methods are the authoritative upward-facing lifecycle boundaries for their respective run subjects.
They are responsible for:

- resolving/restoring the referenced run if needed,
- attaching to the manager-level lifecycle stream,
- returning one unsubscribe handle.

### Required execution-subsystem extensions

#### Agent side

- extend `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`
  - add manager-level lifecycle subscription/dispatch for one run id,
  - emit `ATTACHED` on create/restore registration,
  - emit `TERMINATED` on explicit termination/unregister,
  - emit `FAILED` when runtime/backend closure makes the run inactive unexpectedly.
- extend `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`
  - add `observeAgentRunLifecycle(...)` as the authoritative service boundary above the manager.

#### Team side

- extend `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts`
  - add the same manager-level lifecycle subscription/dispatch shape used on the agent side,
  - do **not** make orchestration depend directly on the existing rich team-event stream.
- extend `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts`
  - add `observeTeamRunLifecycle(...)` as the authoritative service boundary above the manager.

### Orchestration-side adapter

- add `autobyteus-server-ts/src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts`
  - accepts a binding runtime descriptor,
  - delegates to `AgentRunService.observeAgentRunLifecycle(...)` or `TeamRunService.observeTeamRunLifecycle(...)`,
  - returns the shared `ObservedRunLifecycleEvent` shape upward to `ApplicationRunObserverService`.

This keeps `ApplicationRunObserverService` free from agent/team manager specifics and prevents boundary guessing.

## Execution Event Ingress Authority

`ApplicationExecutionEventIngressService` is the **single authoritative execution-event ingress boundary**.
It is the only owner allowed to append new immutable app-event journal rows.

### Allowed callers into the ingress boundary

- `publish_artifact` tool for runtime artifact publications,
- `ApplicationOrchestrationHostService` for explicit lifecycle events caused by control actions such as `startRun`, explicit terminate, or supersede,
- `ApplicationRunObserverService` for observed runtime lifecycle events such as unexpected termination/failure,
- `ApplicationOrchestrationRecoveryService` for recovery-time orphaning or unrecoverable-binding events.

During startup recovery, the only caller allowed to reach the ingress owner before the startup gate opens is `ApplicationOrchestrationRecoveryService`.
Live runtime-originated artifact publication must wait at the `publish_artifact` entry boundary until `ApplicationOrchestrationStartupGate` reaches `READY`.
For bindings created through direct `startRun(...)`, the ingress owner copies persisted `bindingIntentId` from the authoritative binding row into the immutable event envelope before dispatch.
The platform does not defer `runStarted` or early artifact delivery until app-owned mapping commit finishes; app-owned pending intent plus at-least-once retry semantics handle that crash/race window explicitly.

### Forbidden shapes

- no direct journal writes from the tool,
- no direct journal writes from the observer service,
- no direct journal writes from the orchestration host service,
- no direct journal writes from recovery.

Those callers may decide *that* an event should exist, but only the ingress service decides how it is normalized and written.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceResolver` | `DS-002` | `ApplicationOrchestrationHostService` | Resolve bundle-local vs shared resource refs into canonical executable definitions | Keeps resource resolution policy out of app backends and out of run services | Main line would become cluttered with resource-lookup detail |
| `ApplicationRunBindingStore` | `DS-002`, `DS-004`, `DS-007` | `ApplicationOrchestrationHostService`, `RecoveryService`, `RunObserverService` | Persist per-app binding records and binding-member records | Durable app-owned orchestration needs a platform-owned binding record | Run services would start owning app binding semantics |
| `ApplicationRunLookupStore` | `DS-003`, `DS-007` | `ApplicationExecutionEventIngressService`, `RecoveryService` | Derived global `runId -> applicationId + bindingId` lookup | Runtime publication starts from run identity, not app identity | Publication routing would degrade into cross-app scans |
| `ApplicationCatalogSnapshot / Diagnostics` | `DS-007` | `ApplicationBundleService`, `RecoveryService`, browser host | Separate valid application catalog entries from quarantined invalid-application diagnostics | Prevents one bad app/package from poisoning the whole startup path | Main line would start throwing discovery failures globally |
| `ApplicationExecutionEventJournalStore` | `DS-003`, `DS-004`, `DS-005` | `ExecutionEventIngressService` and `DispatchService` | Persist immutable normalized event rows | Preserves retry-safe ordered delivery into app backends | Dispatch logic would need hidden persistence detail |
| `ApplicationOrchestrationStartupGate` | `DS-002`, `DS-003`, `DS-007` | `ServerRuntime`, `ApplicationOrchestrationHostService`, runtime artifact tool entry | Serialize live orchestration-sensitive traffic against startup recovery | Prevents live writes/ingress from racing with lookup rebuild and observer reattachment | Main line would otherwise rely on implicit listen ordering |
| `ApplicationBoundRunLifecycleGateway` | `DS-004`, `DS-007` | `ApplicationRunObserverService`, `RecoveryService` | Unify agent/team lifecycle observation behind one orchestration-facing shape | Prevents orchestration from depending on two different execution-owner interfaces | Main line would be polluted with agent/team branching |
| `App-Owned Schema Artifacts / Generated Client` | `DS-001`, `DS-008` | `ApplicationBackend` and iframe app authoring/build flow | Own GraphQL SDL/OpenAPI/shared DTO artifacts plus generated frontend client/types for one app | Keeps type safety and code generation app-owned instead of platform-owned | The platform would start owning app business semantics or frontends would guess payloads ad hoc |
| `App-Owned Pending Binding Intent` | `DS-002` | `ApplicationBackend` | Persist one durable pending-intent row before direct `startRun(...)` and reconcile it later if mapping finalization crashes | Makes the direct-start handoff restart-safe without moving business meaning into the platform | The platform would need to guess business intent or defer events implicitly |
| `App-Owned Business-Object-to-Binding Mapping` | `DS-002`, `DS-003`, `DS-004` | `ApplicationBackend` | Persist mappings from app business records to one or more `bindingId` values | Keeps business meaning inside the app while letting the platform route/recover by binding identity | The platform would start carrying unnatural generic business-reference fields |
| `ApplicationLaunchDescriptorBuilder` | `DS-001` | `ApplicationHostLaunchOwner` | Build iframe URL, query hints, and bootstrap envelope v2 | Keeps launch bootstrap detail out of general page shell logic | Host launch path would become brittle and mixed with page UI state |
| `ApplicationResourceConfigurationStore` | `DS-009` | `ApplicationResourceConfigurationService` | Persist selected `resourceRef` plus launch defaults for each app-declared resource slot | Keeps resource setup durable without making it implicit run state | Main line would collapse setup and launch semantics again |
| `WorkspaceExecutionLinkBuilder` (optional thin helper) | `DS-002`, `DS-003` | app backend / frontend consumers | Derive host-usable execution handoff identity from binding summary | Supports runtime handoff without making workspace routes the orchestration owner | App backend would start building host route strings ad hoc |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Application backend worker lifecycle | `application-engine` | `Reuse` | Already the correct owner for app backend runtime startup/stop/invocation | N/A |
| Application-scoped transport boundary | `application-backend-gateway` | `Reuse` | Already keyed by `applicationId`; request-context semantics only need simplification | N/A |
| Imported package-root persistence, package-level diagnostics, and package reload/remove flows | `application-packages` | `Extend` | Current package service and stores already own import/remove and root persistence; they should be tightened into one explicit package-registry boundary | No new top-level subsystem needed |
| Bundle discovery and validation | `application-bundles` | `Extend` | Still the right owner, but the manifest/catalog contract must stop requiring `runtimeTarget` | No new subsystem needed |
| Invalid-application diagnostics and startup quarantine | `application-bundles` | `Extend` | Discovery already belongs here; it now needs best-effort snapshot + diagnostics instead of fatal-on-first-invalid behavior | No new top-level discovery subsystem needed |
| App storage roots and per-app platform/app DB lifecycle | `application-storage` | `Extend` | Already owns app-root layout; can also bootstrap a global orchestration DB for the derived lookup index | No new storage/path subsystem needed |
| Bundle-independent persisted known-app inventory and existing-state presence | `application-storage` via `ApplicationPlatformStateStore` | `Extend` | Storage layout enumeration already belongs here; startup should not invent a separate ad hoc inventory helper | No new inventory subsystem needed |
| Agent run execution | `agent-execution` | `Extend` | Already the correct concrete execution owner; must add an authoritative service-level lifecycle observation boundary | No new execution subsystem needed |
| Team run execution | `agent-team-execution` | `Extend` | Already the correct concrete execution owner; must add the same authoritative lifecycle observation boundary | No new execution subsystem needed |
| Application-owned orchestration state, binding control, recovery, event ingress, lifecycle observation | current `application-sessions` | `Create New` | Current subsystem is semantically wrong; it is built around session ownership and retained session projections | Extending it would preserve the wrong governing abstraction |
| Worker-facing runtime control into host | current worker runtime context | `Create New` | Current worker context has no runtime-control boundary and should not call host internals directly | Needs a new authoritative bridge |
| Cross-app run lookup persistence | none | `Create New` | Current per-app scan approach is too tied to session identity and is not appropriate for many bound runs | Needs dedicated derived-index ownership |
| Startup recovery / resume of bindings | none | `Create New` | Durable bindings without a startup recovery owner do not satisfy restart-safe ownership | Needs an explicit startup owner and hook |
| Startup traffic admission / serialization for orchestration-sensitive paths | none | `Create New` | Raw `app.listen(...)` timing is not a sufficient correctness boundary once recovery rebuilds derived lookup state | Needs an explicit startup gate that live orchestration/event paths must honor |
| Direct `startRun(...)` correlation establishment | none as an explicit contract | `Create New` | Binding-centric correlation needs one concrete pending-intent + reconciliation handshake once the generic business-reference field is removed | Neither pure app code nor pure platform code alone can make the cross-boundary crash/race contract explicit |
| App-owned business API schema/codegen and generated clients | current frontend SDK + shared contracts | `Create New` | Platform packages are transport/infra owners, not the right owner for one app’s business schema or generated client output | App-owned GraphQL/OpenAPI/shared-contract artifacts must remain inside each application workspace |
| Persisted application resource configuration | current host launch form + orchestration resource model | `Extend` | Existing UX and runtime resource concepts are reusable, but the semantics must change from launch-now to save-for-later setup | A brand-new product subsystem is unnecessary if the ownership line is corrected |
| Quarantined-app repair/reload re-entry | startup recovery + bundle reload hooks | `Create New` | Startup-only recovery is not enough once invalid apps are promised as repairable in place | Needs one app-scoped availability/re-entry owner above bundle reload plus recovery/dispatch collaborators |
| Authoritative app-declared resource-slot declaration contract | application manifest v3 | `Extend` | Host setup needs pre-worker metadata, and manifest discovery already owns bundle-level validation | No separate backend-only slot schema layer should be invented for host configuration |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-packages` | persisted package registry, imported package metadata, package-level diagnostics, package import/remove/reload flows, package-root descriptors for bundle discovery | `DS-007`, `DS-010`, `DS-012` | Host package management + bundle discovery bootstrap | `Extend` | Tighten the current package service/stores into one authoritative package-registry owner |
| `application-bundles` | app catalog snapshot, application-level invalid diagnostics, manifest validation, manifest-declared resource slots, bundle-local resource discovery, targeted app reload validation | `DS-001`, `DS-002`, `DS-007`, `DS-009`, `DS-010` | Host launch + orchestration resource resolution + startup isolation + slot declaration authority | `Extend` | Remove catalog/runtimeTarget coupling and fatal-on-first-invalid discovery behavior while making manifest metadata authoritative for host-visible slot declarations |
| `application-engine` | app worker lifecycle, worker IPC, worker invocation | `DS-001`, `DS-002`, `DS-005`, `DS-006` | Backend gateway + worker runtime bridge | `Extend` | Add worker->host runtime-control IPC |
| `application-backend-gateway` | app transport boundary and engine ensure-ready surface | `DS-001`, `DS-002` | Browser host + iframe app backend calls | `Extend` | Request context becomes launch-instance-aware, not session-aware |
| `application-orchestration` | resource resolution, persisted application resource configuration, app availability/re-entry, runtime control, startup coordination, binding persistence, recovery, lifecycle observation, execution-event ingress, event journaling/dispatch | `DS-002`, `DS-003`, `DS-004`, `DS-005`, `DS-006`, `DS-007`, `DS-009`, `DS-010` | App backend runtime control boundary + host resource setup + repair/reload re-entry | `Create New` | Replaces `application-sessions` |
| `application-storage` | per-app DB lifecycle, persisted known-app inventory, existing-state presence probing, and global orchestration index DB bootstrap/path ownership | `DS-003`, `DS-004`, `DS-005`, `DS-007`, `DS-011` | Orchestration stores + startup inventory | `Extend` | Storage/path concerns remain centralized here |
| `autobyteus-web Applications host` | engine-first app launch, iframe bootstrap v2, and persisted application resource configuration UI | `DS-001`, `DS-009` | Browser host | `Extend` | Remove session-centric host UI flow while reusing the useful configuration form shape |
| `application-sdk-contracts` + backend/frontend SDKs | author-facing contract shapes, backend mount transport helper, and runtime-control/context exposure | `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-006`, `DS-008` | Bundle authors | `Extend` | Platform SDKs stay schema-agnostic while exposing the hosted backend mount cleanly |
| `applications/<app>/api` + `frontend-src/generated` | app-owned schema artifacts and generated clients | `DS-001`, `DS-008` | App backend + iframe app | `Create New` | Not a platform subsystem; each app owns its own business API contract/codegen |
| `applications/<app>/backend-src` pending-intent/correlation services | app-owned pending binding intent persistence and reconciliation | `DS-002`, `DS-003`, `DS-004` | App backend | `Create New` | App-owned because it carries business-record meaning even though it consumes platform `bindingIntentId` / `bindingId` |
| `agent-execution` + `agent-team-execution` lifecycle observation extensions | service-level lifecycle notification boundaries | `DS-004`, `DS-007` | Run observer and recovery owners | `Extend` | Add a consistent orchestration-facing observation contract |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | `application-orchestration` | Governing service boundary | Start/control/query/terminate/supersede bindings | One authoritative app-facing orchestration entrypoint | Yes |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | `application-packages` | Governing package-registry boundary | Persist imported package roots/metadata, compute package-level diagnostics, and drive import/remove/reload flows | One authoritative package-registry owner | Yes |
| `autobyteus-server-ts/src/application-packages/domain/application-package-registry-snapshot.ts` | `application-packages` | Shared registry snapshot owner | Represent package-root descriptors plus package-level diagnostics | One package-registry snapshot shape | Yes |
| `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | `application-bundles` | Shared discovery result owner | Represent valid applications plus application-level diagnostics in one best-effort snapshot | One shared discovery/quarantine shape | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts` | `application-storage` | Existing-state access boundary | Enumerate persisted known app ids and distinguish prepared active-app state from existing persisted state access by storage layout | One durable storage-access boundary for recovery/journaling semantics | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | `application-orchestration` | Governing startup-readiness boundary | Serialize live orchestration-sensitive traffic against startup recovery | One startup-admission concern | Yes |
| `.../services/application-execution-event-ingress-service.ts` | `application-orchestration` | Governing event-ingress owner | Normalize artifact/lifecycle events and append journal rows | One authoritative ingress boundary for execution events | Yes |
| `.../services/application-run-observer-service.ts` | `application-orchestration` | Governing lifecycle observer owner | Attach observers and update bindings from observed lifecycle changes | One lifecycle-observer concern | Yes |
| `.../services/application-orchestration-recovery-service.ts` | `application-orchestration` | Governing startup owner | Rebuild derived lookup index, restore bindings, reattach observers | One startup-resume concern | Yes |
| `.../services/application-resource-configuration-service.ts` | `application-orchestration` | Governing configuration owner | Persist and return app resource-slot configuration without creating runs | One host/app resource-setup concern | Yes |
| `.../stores/application-resource-configuration-store.ts` | `application-orchestration` | Persistence boundary | Store resource-slot configuration rows keyed by application and slot | One durable setup concern | Yes |
| `.../services/application-bound-run-lifecycle-gateway.ts` | `application-orchestration` | Thin adapter | Delegate to agent/team lifecycle service methods and normalize upward | One adapter concern | Yes |
| `.../services/application-execution-event-dispatch-service.ts` | `application-orchestration` | Dispatch owner | Ordered journal drain and retry loop | One bounded local concern | Yes |
| `.../stores/application-run-binding-store.ts` | `application-orchestration` | Per-app persistence boundary | Per-app binding rows + member rows | Binding persistence is one subject | Yes |
| `.../stores/application-execution-event-journal-store.ts` | `application-orchestration` | Per-app persistence boundary | Immutable per-app app-event journal rows + ack cursor | Journal state is one subject | Yes |
| `.../stores/application-run-lookup-store.ts` | `application-orchestration` | Global persistence boundary | Derived global `runId -> app/binding` lookup | Cross-app lookup is a distinct concern | Yes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Shared internal type owner | Shared orchestration-facing lifecycle event type | Both execution subsystems and orchestration use it | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `agent-execution` | Service boundary extension | Add `observeAgentRunLifecycle(...)` | One subject-owned upward boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `agent-execution` | Manager extension | Add manager-level lifecycle subscription/dispatch | Keeps backend/run-level lifecycle normalization inside agent execution | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution` | Service boundary extension | Add `observeTeamRunLifecycle(...)` | One subject-owned upward boundary | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `agent-team-execution` | Manager extension | Add manager-level lifecycle subscription/dispatch | Keeps team lifecycle normalization inside team execution | Yes |
| `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | `application-orchestration` | Runtime artifact entry wrapper | Wait for startup admission, then forward live artifact publications to the ingress owner | One live-ingress entry concern | Yes |
| `autobyteus-server-ts/src/server-runtime.ts` | server startup | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if ready state cannot be released | One startup orchestration hook | No |
| `autobyteus-web/components/applications/ApplicationResourceConfigurationModal.vue` | web host | Browser configuration surface | Reuse the old launch-form UX to edit persisted resource-slot configuration | One host setup UI concern | Yes |
| `applications/<app>/backend-src/services/run-binding-correlation-service.ts` | app-owned backend | App-owned correlation owner | Persist pending binding intent, finalize business-record mapping, and reconcile by `bindingIntentId` after crashes or early event delivery | One app-owned cross-boundary handoff concern | Yes |
| `applications/<app>/backend-src/repositories/pending-binding-intent-repository.ts` | app-owned backend | App-owned persistence boundary | Store pending binding intent rows | One app-owned persistence concern | Yes |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | frontend SDK | Generic transport-helper boundary | Build schema-agnostic GraphQL/query/command/route invokers from `backendBaseUrl` plus request-context v2 | Keeps mount-path derivation out of every app while avoiding ownership of app business schemas | Yes |
| `applications/<app>/api/graphql/schema.graphql` | app-owned per-app authoring | App-owned business API contract | Authoritative GraphQL schema artifact for one application | One schema owner per app | No |
| `applications/<app>/frontend-src/generated/graphql-client.ts` | app-owned per-app authoring | Generated client artifact | Frontend-usable GraphQL types/operations for one application | Generated output should remain app-owned | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Resource reference shapes (bundle-local vs shared) | `autobyteus-application-sdk-contracts/src/runtime-resources.ts` | contracts package | Needed by server, backend SDK, and app authors | `Yes` | `Yes` | a vague generic selector with optional unrelated fields |
| Binding summary used by runtime control + event envelope | `autobyteus-application-sdk-contracts/src/runtime-bindings.ts` | contracts package | One authoritative binding identity shape including opaque `bindingIntentId` | `Yes` | `Yes` | a kitchen-sink “session/run/execution/business-ref” shape |
| Execution event envelope | `autobyteus-application-sdk-contracts/src/runtime-events.ts` | contracts package | Shared immutable event shape for app event handlers | `Yes` | `Yes` | duplicated local event shapes per package |
| Shared internal observed lifecycle event | `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Orchestration needs one shape above agent/team execution | `Yes` | `Yes` | two parallel agent-only/team-only lifecycle shapes |
| Application catalog snapshot + invalid diagnostics | `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | application-bundles | One authoritative discovery/quarantine shape across startup, host UI, and reload flows | `Yes` | `Yes` | scattered ad hoc error arrays or fatal throw-only behavior |
| Application resource slot declarations + persisted configuration shapes | `autobyteus-application-sdk-contracts/src/manifests.ts`, `src/runtime-resources.ts`, and orchestration config models | contracts + application-orchestration | Slot declarations must be host-readable before worker boot, and persisted config must validate against the same declaration | `Yes` | `Yes` | a hidden host-only setup format disconnected from runtimeControl or a backend-inferred slot schema the host cannot trust |
| Iframe bootstrap v2 payload + backend mount descriptor | `autobyteus-web/types/application/ApplicationIframeContract.ts` | web host | Shared browser host/iframe bootstrap shape including authoritative `backendBaseUrl` | `Yes` | `Yes` | browser-only ad hoc literals duplicated in components |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceRef` | `Yes` | `Yes` | `Low` | Keep `localId` only for bundle-local refs and canonical ids only where shared resolution requires them |
| `ApplicationCatalogSnapshot` | `Yes` | `Yes` | `Low` | Keep valid applications separate from diagnostics; do not force callers to infer invalid apps from thrown discovery errors |
| `ApplicationResourceConfiguration` | `Yes` | `Yes` | `Low` | Keep persisted resource selection/defaults distinct from binding/run identity, and keep `slotKey` validation tied to manifest-declared `resourceSlots` so setup does not masquerade as launch state or drift from declaration authority |
| `ApplicationRunBindingSummary` | `Yes` | `Yes` | `Low` | Keep only binding/run/resource/status plus opaque `bindingIntentId`; do not reintroduce session fields or a generic business-reference field |
| `ApplicationExecutionEventEnvelope` | `Yes` | `Yes` | `Low` | Reuse binding summary including `bindingIntentId` instead of parallel top-level binding/run fields |
| `ObservedRunLifecycleEvent` | `Yes` | `Yes` | `Low` | Keep it intentionally narrow for orchestration only; rich runtime events stay below this boundary |
| Worker `ApplicationRequestContext` v2 | `Yes` | `Yes` | `Low` | Keep it about request source (`applicationId`, optional `launchInstanceId`), not business identity |
| Iframe/backend mount transport descriptor v2 | `Yes` | `Yes` | `Low` | Keep `backendBaseUrl` authoritative; convenience GraphQL/query/command/route URLs derive from it instead of becoming parallel sources of truth |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/domain/models.ts` | `application-orchestration` | Internal model owner | Internal binding rows, runtime execution context, recovery status enums | One internal orchestration model owner | Yes |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | `application-packages` | Authoritative package-registry boundary | Persist imported package roots/metadata, emit package-level diagnostics, and coordinate package import/remove/reload flows | One authoritative package-registry owner | Yes |
| `autobyteus-server-ts/src/application-packages/domain/application-package-registry-snapshot.ts` | `application-packages` | Registry snapshot owner | Represent package-root descriptors plus package-level diagnostics | One shared package-registry shape | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts` | `application-storage` | Existing-state inventory boundary | Enumerate persisted known application ids, probe existing-state presence, and open existing per-app platform state by storage layout | One authoritative startup-inventory plus existing-state access owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | `application-orchestration` | Authoritative public boundary | Public host-side runtime control for app backends | One authoritative app-facing orchestration entrypoint | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | `application-orchestration` | Authoritative startup-readiness boundary | Exclusive startup recovery window plus steady-state release for orchestration-sensitive live traffic | One startup-admission boundary | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-availability-service.ts` | `application-orchestration` | Governing re-entry owner | App-scoped availability state plus repair/reload re-entry coordination | One authoritative post-startup availability/re-entry owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts` | `application-orchestration` | Authoritative event ingress | Normalize and append all execution events to the immutable journal | One authoritative event ingress boundary | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts` | `application-orchestration` | Governing observer owner | Attach/reattach observers and update binding state from lifecycle changes | One lifecycle-observer owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts` | `application-orchestration` | Governing startup owner | Recover bindings, rebuild lookup index, attach observers, mark orphaned bindings | One startup-resume owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-bound-run-lifecycle-gateway.ts` | `application-orchestration` | Thin adapter | Delegate to agent/team observation methods and normalize upward | One adapter concern | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts` | `application-orchestration` | Dispatch owner | Ack/retry loop and startup resume | One bounded local concern | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | `application-orchestration` | Per-app persistence boundary | Per-app binding rows and member rows | One subject | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts` | `application-orchestration` | Per-app persistence boundary | Immutable per-app event journal + dispatch cursor | One subject | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-lookup-store.ts` | `application-orchestration` | Global persistence boundary | Derived global `runId/bindingId -> applicationId` lookup | One subject | Yes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | shared internal runtime domain | Shared internal type owner | Shared orchestration-facing lifecycle event type | One type owner | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `agent-execution` | Subject-owned service boundary | Create/resolve/terminate plus `observeAgentRunLifecycle(...)` | One agent-run service owner | Yes |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `agent-execution` | Internal manager extension | Active-run registry plus manager-level lifecycle subscription/dispatch | One agent-run manager concern | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `agent-team-execution` | Subject-owned service boundary | Create/resolve/terminate plus `observeTeamRunLifecycle(...)` | One team-run service owner | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `agent-team-execution` | Internal manager extension | Active-run registry plus manager-level lifecycle subscription/dispatch | One team-run manager concern | Yes |
| `autobyteus-server-ts/src/application-storage/stores/application-global-platform-state-store.ts` | `application-storage` | Global storage boundary | Open/transaction wrapper for the global orchestration DB | Cross-app index storage should stay under storage ownership | Yes |
| `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | `application-orchestration` | Runtime artifact entry wrapper | Gate live artifact traffic on startup readiness and forward to the ingress owner | One live artifact ingress entry | Yes |
| `autobyteus-server-ts/src/server-runtime.ts` | server startup | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if ready state cannot be released | One startup integration point | No |
| `autobyteus-web/stores/applicationHostStore.ts` | `autobyteus-web Applications host` | Browser launch owner | Engine ensure-ready + iframe bootstrap state | One page-launch owner | Yes |
| `autobyteus-web/components/applications/ApplicationResourceConfigurationModal.vue` | `autobyteus-web Applications host` | Browser configuration surface | Reuse the old launch-form UX to edit persisted resource-slot configuration | One host setup concern | Yes |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | `autobyteus-web Applications host` | Shared host type owner | v2 iframe bootstrap envelope and authoritative backend mount descriptor | One shared browser type owner | Yes |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | frontend SDK | Generic transport-helper owner | Build schema-agnostic invokers from `backendBaseUrl` and request-context v2 | One optional transport helper owner | Yes |
| `applications/<app>/backend-src/services/run-binding-correlation-service.ts` | app-owned per-app authoring | App-owned correlation owner | Persist pending binding intents, finalize mappings, and reconcile by `bindingIntentId` | One app-owned handoff/reconciliation owner | Yes |
| `applications/<app>/backend-src/repositories/pending-binding-intent-repository.ts` | app-owned per-app authoring | App-owned persistence owner | Store pending binding intent rows | One app-owned persistence owner | Yes |
| `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | `application-bundles` | Discovery snapshot owner | Represent valid application entries plus application-level invalid diagnostics without fatal global throws | One discovery/quarantine shape | Yes |
| `autobyteus-server-ts/src/application-orchestration/services/application-resource-configuration-service.ts` | `application-orchestration` | Resource-configuration owner | Read/write persisted application resource-slot setup, validate against manifest-declared slot declarations, and expose it to host/runtimeControl | One setup owner | Yes |
| `autobyteus-server-ts/src/application-orchestration/stores/application-resource-configuration-store.ts` | `application-orchestration` | Resource-config persistence owner | Store selected `resourceRef` plus launch defaults per app+slot | One durable configuration store | Yes |
| `autobyteus-application-sdk-contracts/src/{manifests,request-context.ts,runtime-*.ts,backend-definition.ts}` | contracts package | Shared contracts owner | Versioned bundle/backend/request/runtime/event/bootstrap transport types, including manifest-declared `resourceSlots` | Split by subject instead of one mixed file | Yes |
| `applications/<app>/api/graphql/schema.graphql` | app-owned per-app authoring | App-owned schema artifact owner | Authoritative app GraphQL schema/introspection input | One schema owner per app | No |
| `applications/<app>/backend-src/graphql/index.ts` | app-owned per-app authoring | App-owned GraphQL runtime boundary | Worker-side GraphQL executor/resolver composition for one app | One backend business API boundary per app | Yes |
| `applications/<app>/frontend-src/generated/graphql-client.ts` | app-owned per-app authoring | Generated client artifact owner | Frontend-usable GraphQL types/operations for one app | Generated output should remain app-owned | Yes |

## Ownership Boundaries

Authority changes hands at these points:

1. **Browser host -> backend runtime**
   - The browser host owns iframe bootstrap and app-page readiness.
   - The backend gateway/engine own backend worker readiness.
   - The browser host must not launch runs directly.

2. **App backend -> platform orchestration**
   - The application backend decides *what* to orchestrate and *why*.
   - `ApplicationOrchestrationHostService` decides *how platform-owned runtime control is executed and persisted*.
   - App code must use `runtimeControl`, not raw run services.

3. **Platform orchestration -> concrete run services**
   - The orchestration host owns binding/resource/application context.
   - Agent/team run services own only the concrete execution lifecycle and service-level lifecycle-observation boundaries for their own subject.
   - Run services must not absorb application-owned business identity.

4. **Concrete execution -> lifecycle gateway -> observer owner**
   - Agent/team execution owners expose service-level lifecycle observation.
   - The lifecycle gateway adapts those subject-owned boundaries to one orchestration-facing shape.
   - The observer owner owns binding-state transitions above that adapter.

5. **Runtime execution event ingress -> app backend event handling**
   - `ApplicationExecutionEventIngressService` owns event normalization and journal append for both artifact publications and run lifecycle events.
   - `ApplicationExecutionEventDispatchService` owns delivery retries.
   - The app backend owns business projection after receiving the event.
   - The platform must not continue to own app-visible retained artifact projection as the primary application view.

6. **Startup recovery -> steady-state orchestration**
   - `ApplicationOrchestrationStartupGate` owns when orchestration-sensitive live traffic is admitted.
   - `ApplicationOrchestrationRecoveryService` rebuilds runtime-facing orchestration state inside that exclusive startup window.
   - The gate releases to steady-state ready only after recovery and dispatch resume have both completed.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationOrchestrationHostService` | resource resolver, binding store, lifecycle gateway, observer attachment on new bindings | worker `runtimeControl`, internal platform callers | app backend or worker bridge calling `AgentRunService`, `TeamRunService`, or stores directly | expand orchestration API, not bypass it |
| `ApplicationExecutionEventIngressService` | lookup resolution, event normalization, journal append | `publish_artifact`, observer service, recovery service, orchestration host service | any caller writing journal rows directly | enrich ingress API, not bypass it |
| `ApplicationOrchestrationStartupGate` | startup state, recovery-window promise, ready/failed release | `server-runtime.ts`, `ApplicationOrchestrationHostService`, runtime artifact tool entry | live orchestration-sensitive traffic bypassing the startup gate | enrich the gate contract, not bypass it |
| `ApplicationAvailabilityService` | app-scoped availability state, repair/reload re-entry coordination, dispatch-resume gating | browser host repair/reload flows, backend gateway, orchestration host, dispatch service | callers treating app repair/reload as an ad hoc bundle refresh with no coordinated re-entry | enrich availability/re-entry APIs, not bypass them |
| `ApplicationExecutionEventDispatchService` | pending-row read, attempt recording, ack/failure recording, retry timer | startup hook, ingress owner scheduling | callers invoking app event handlers directly after journaling | add dispatch API, not bypass it |
| `ApplicationBoundRunLifecycleGateway` | agent/team service-specific observation methods | run observer, recovery service | orchestration depending on agent/team managers directly | enrich gateway or service-level observe methods |
| `ApplicationBackendGatewayService` | app-scoped mount routing, ensure-ready delegation, request-context normalization | browser host, iframe app frontends, optional frontend SDK helpers | browser/frontend code reaching directly into engine host or worker IPC | expand the gateway/mount helper surface, not the bypass |
| `ApplicationEngineHostService` | worker supervisor, IPC client, worker status, notification bridge | backend gateway, dispatch service | gateway or orchestration reaching into worker runtime internals | add engine host methods |
| `ApplicationHostLaunchOwner` | iframe launch descriptor builder, ready timeout, bootstrap postMessage | application page shell | page shell owning low-level postMessage contract or run creation | strengthen dedicated host-launch owner |
| `ApplicationPackageRegistryService` | imported package roots, package metadata, package-level diagnostics, package import/remove/reload flows | browser host package-management surfaces, bundle discovery | callers reading/writing package stores directly or inventing their own package diagnostics | enrich registry APIs, not bypass them |
| `ApplicationBundleService` | best-effort discovery, valid catalog entries, application-level invalid diagnostics, manifest-declared slot metadata, targeted app reload validation | server startup, browser host catalog surfaces, availability re-entry owner, resource-configuration owner | callers assuming discovery must throw fatally on one bad app or inventing their own slot metadata source | enrich snapshot/declaration/reload APIs, not bypass it |
| `ApplicationPlatformStateStore` | prepared-vs-existing platform-state access by applicationId-derived storage layout | binding store, journal store, recovery service, event ingress | callers forcing recovery/journaling through bundle-preparation methods or ad hoc filesystem paths | add explicit existing/prepared access APIs, not bypass them |
| `ApplicationResourceConfigurationService` | persisted slot configuration store, manifest-declared slot metadata readback, slot-validation rules | browser host setup surfaces, `runtimeControl` readback | host UI launching runs directly or app code reading host-only state ad hoc | enrich configuration/readback APIs, not bypass it |

## Dependency Rules

- `autobyteus-web` application pages may depend on application catalog + invalid-application diagnostics + backend ensure-ready boundary + iframe bootstrap types.
- Browser host code must not depend on orchestration stores or run services.
- App frontend code may depend on:
  - app-owned generated clients or shared app-owned contracts,
  - schema-agnostic frontend SDK mount helpers,
  - iframe bootstrap/request-context types.
- App frontend code must not depend on server internal routes outside the hosted backend mount or on worker internals.
- App backend code may depend on `runtimeControl`, backend-definition contracts, app-owned pending-intent/correlation services, and app-owned business schema/resolver code only; it must not depend on server internal services.
- Platform contracts/SDK packages may define manifest/request/runtime/event/bootstrap transport shapes, including opaque `bindingIntentId`, but they must not import or publish app-specific GraphQL schemas, OpenAPI documents, or generated business clients.
- Generated app clients may depend on app-owned schema artifacts plus generic frontend SDK transport helpers; the dependency must not point back upward from platform packages into app-owned business artifacts.
- `ApplicationPackageRegistryService` may depend on `ApplicationPackageRegistryStore`, `ApplicationPackageRootSettingsStore`, and downstream refresh hooks, but package-management callers must not mutate those stores directly.
- `ApplicationBundleService` may depend on `ApplicationPackageRegistryService` for authoritative package-root descriptors and package diagnostics, but must not read package-root stores directly.
- `ApplicationPlatformStateStore` is the only boundary allowed to enumerate persisted known application ids or probe existing-state presence; recovery/availability callers must not re-implement filesystem scans.
- `ApplicationBackendGatewayService` may depend on `ApplicationEngineHostService`, `ApplicationAvailabilityService`, and generic transport/request-context helpers, but not on app-specific business schemas or orchestration stores.
- `ApplicationRuntimeControlBridge` may depend on `ApplicationOrchestrationHostService`, but not on lower-level stores and run services independently.
- `ApplicationResourceConfigurationService` may depend on `ApplicationBundleService` for authoritative slot declarations, but must not parse manifests independently.
- `ApplicationAvailabilityService` may depend on `ApplicationBundleService`, `ApplicationOrchestrationRecoveryService`, and `ApplicationExecutionEventDispatchService`, but those collaborators must not each invent their own app-availability state machine.
- `ApplicationOrchestrationHostService` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - `ApplicationAvailabilityService`,
  - resource resolver,
  - binding store,
  - lifecycle gateway,
  - run observer service,
  - `AgentRunService`,
  - `TeamRunService`,
  - `ApplicationExecutionEventIngressService` for explicit lifecycle events.
- `ApplicationRunObserverService` may depend on:
  - lifecycle gateway,
  - binding store,
  - lookup store,
  - `ApplicationExecutionEventIngressService`.
- `ApplicationOrchestrationRecoveryService` may depend on:
  - binding store,
  - lookup store,
  - lifecycle gateway,
  - run observer service,
  - `ApplicationExecutionEventIngressService`.
- `ApplicationExecutionEventIngressService` may depend on:
  - lookup store,
  - binding store,
  - event journal store.
- `publish-artifact-tool.ts` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - `ApplicationExecutionEventIngressService`.
- `server-runtime.ts` may depend on:
  - `ApplicationOrchestrationStartupGate`,
  - `ApplicationOrchestrationRecoveryService`,
  - `ApplicationExecutionEventDispatchService`.
- `ApplicationExecutionEventDispatchService` may depend on:
  - event journal store,
  - `ApplicationEngineHostService`.
- `application-bundles` may provide resource metadata plus catalog diagnostics into orchestration recovery, but it must not own launch policy, active bindings, or dispatch retries.
- `application-storage` owns storage path/bootstrap concerns. Orchestration stores should use storage-owned DB access boundaries instead of embedding path logic.

Forbidden shortcuts:

- worker app code -> raw `AgentRunService` / `TeamRunService`
- browser host -> run services / orchestration stores
- app frontend -> worker process, engine IPC, or internal routes outside the hosted backend mount
- platform packages -> app-owned GraphQL schemas, OpenAPI documents, or generated frontend clients
- `publish_artifact` -> direct journal writes
- live `publish_artifact` traffic -> `ApplicationExecutionEventIngressService` without first honoring `ApplicationOrchestrationStartupGate`
- observer service -> direct journal writes
- recovery service -> direct journal writes
- orchestration host -> direct journal writes
- live `runtimeControl` public methods -> binding/lookup mutation before `ApplicationOrchestrationStartupGate` is ready
- orchestration -> agent/team managers directly
- backend gateway -> binding stores or run services directly
- backend gateway -> app-specific business-schema interpretation
- app backend -> `runtimeControl.startRun(...)` without first persisting one pending binding intent for direct start flows
- host resource-configuration UI -> immediate run creation
- invalid application discovery -> fatal process shutdown by default
- app backend -> session-like request-context business identity

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | browser/application host transport descriptor | Give the iframe one authoritative app-scoped backend mount base URL | `{ applicationId, launchInstanceId? }` via the companion bootstrap envelope | GraphQL/routes/query/command URLs derive from this base |
| `POST /rest/applications/:applicationId/backend/ensure-ready` | application engine launch | Ensure backend worker readiness for app launch | `applicationId` route id | New explicit host-launch surface |
| `GET /rest/applications/:applicationId/backend/status` | application engine status | Report current backend worker status for one app | `applicationId` route id | Useful for host/debug tooling only |
| `POST /rest/applications/:applicationId/backend/graphql` | app-owned GraphQL transport | Forward one app-owned GraphQL request into the current app worker | route `applicationId` + requestContext `{ applicationId, launchInstanceId? }` + `ApplicationGraphqlRequest` | GraphQL schema remains app-owned |
| `ANY /rest/applications/:applicationId/backend/routes/*` | app-owned route transport | Forward one app-owned route request into the current app worker | route `applicationId` + requestContext + normalized method/path/query/header/body | Route/OpenAPI contract remains app-owned |
| `POST /rest/applications/:applicationId/backend/queries/:queryName` | app convenience query transport | Forward one app-defined query into the current app worker | route `applicationId` + requestContext + app-defined input | Convenience surface; not the only real-app model |
| `POST /rest/applications/:applicationId/backend/commands/:commandName` | app convenience command transport | Forward one app-defined command into the current app worker | route `applicationId` + requestContext + app-defined input | Convenience surface; not the only real-app model |
| `ApplicationOrchestrationStartupGate.runStartupRecovery(task)` | startup coordination | Execute the one exclusive orchestration startup window and release ready/failed state | startup callback | Internal authoritative startup-coordination boundary |
| `ApplicationOrchestrationStartupGate.awaitReady()` | startup coordination | Block live orchestration-sensitive callers until steady-state startup is released | none | Used by runtime-control and live artifact-entry boundaries |
| `ApplicationPackageRegistryService.getRegistrySnapshot()` | package registry | Return persisted package records, package-root descriptors, and package-level diagnostics | none | Authoritative startup/input for bundle discovery and host package-management surfaces |
| `ApplicationPackageRegistryService.importPackage(input)` | package registry | Persist one imported package source and refresh downstream discovery state | `ApplicationPackageImportInput` | Governing package-import entrypoint |
| `ApplicationPackageRegistryService.removePackage(packageId)` | package registry | Remove one imported package source from the registry and refresh downstream discovery state | `packageId` | If persisted app state still exists, affected apps become `PERSISTED_ONLY` / `QUARANTINED`; removal does not delete run/journal state implicitly |
| `ApplicationPackageRegistryService.reloadPackage(packageId)` | package registry | Reprobe one registered package source and refresh package-level diagnostics/root descriptors | `packageId` | Governing package-reload entrypoint; does not itself rerun app-scoped orchestration recovery |
| `ApplicationBundleService.getCatalogSnapshot()` | application discovery | Return valid application entries plus application-level invalid/unavailable diagnostics derived from the current package-registry snapshot | none | Internal authoritative app-catalog snapshot; package-level diagnostics stay in the package-registry boundary |
| `ApplicationBundleService.reloadApplication(applicationId)` | application discovery | Revalidate one application/package and update its catalog entry or diagnostic | `applicationId` | Used by app repair/reload flows; does not itself rerun orchestration recovery |
| `ApplicationAvailabilityService.reloadAndReenter(applicationId)` | app availability / re-entry | Leave quarantine through targeted reload, app-scoped recovery rerun, and dispatch resume | `applicationId` | Governing repair/reload entrypoint; returns updated availability state |
| `ApplicationPlatformStateStore.listKnownApplicationIds()` | persisted-state inventory | Enumerate startup-known application ids without bundle dependence | none | Authoritative startup inventory boundary for persisted app state |
| `ApplicationPlatformStateStore.getExistingStatePresence(applicationId)` | persisted-state inventory | Report whether existing per-app platform state is currently present | `applicationId` | Used to produce `NO_PERSISTED_STATE` without preparing new state |
| `ApplicationAvailabilityService.applyStartupRecoveryOutcome(applicationId, startupPresence, outcome)` | startup availability mapping | Map startup presence plus recovery outcome into steady-state availability/admission | `{ applicationId, startupPresence, outcome }` | Governing owner for `NO_PERSISTED_STATE` handling and final startup admission state |
| `ApplicationResourceConfigurationService.upsertConfiguration(applicationId, slotKey, input)` | persisted app resource setup | Save resource selection plus launch defaults for one declared slot | `{ applicationId, slotKey }` + configuration payload | Rejects unknown `slotKey` and resource refs that violate the manifest declaration; presents `autoExecuteTools` as visible but locked to `true`; does not start runs |
| `ApplicationResourceConfigurationService.listConfigurations(applicationId)` | persisted app resource setup | Return declared slots plus saved configuration state | `applicationId` | Used by the pre-entry launch gate and host settings/setup; exposes manifest-declared slot metadata plus persisted state |
| `runtimeControl.listAvailableResources(filter?)` | orchestration resource catalog | List bundle-local/shared accessible runtime resources | optional `{ owner?, kind? }` filter | Worker-side authoritative platform API |
| `runtimeControl.getConfiguredResource(slotKey)` | persisted app resource setup | Return the saved configuration for one declared resource slot | `slotKey` | Rejects unknown `slotKey`; returns `null` only when the slot is declared but currently unconfigured; app-mode tool approval reads back as auto-approved |
| `runtimeControl.startRun(input)` | run binding control | Start one run and persist one durable binding | `{ bindingIntentId, resourceRef, launch }` | Returns a binding summary containing `bindingId`, `bindingIntentId`, and run identity; `launch` shape must match resource kind explicitly |
| `runtimeControl.getRunBinding(bindingId)` | run binding query | Return one binding summary | `bindingId` | Authoritative binding lookup |
| `runtimeControl.getRunBindingByIntentId(bindingIntentId)` | run binding query | Resolve one created binding from the original direct-start intent token | `bindingIntentId` | Authoritative reconciliation lookup for crash recovery and early-event correlation |
| `runtimeControl.listRunBindings(filter)` | run binding query | List bindings for the current app | optional `{ status? }` | Used for recovery/inspection; intent-specific reconciliation uses `getRunBindingByIntentId(...)` |
| `runtimeControl.postRunInput(input)` | run binding control | Deliver user/application input to one binding | `{ bindingId, text, targetMemberName?, contextFiles?, metadata? }` | Use binding identity, not raw run-service bypass |
| `runtimeControl.terminateRunBinding(bindingId)` | run binding control | Terminate one bound run | `bindingId` | Returns updated binding summary |
| `publish_artifact(...)` | execution-event ingress | Publish one runtime artifact for the current binding | runtime-injected execution context + artifact payload | Tool enters only through the ingress boundary |
| `AgentRunService.observeAgentRunLifecycle(runId, listener)` | agent execution lifecycle | Observe one agent run through the shared lifecycle shape | `runId` | Authoritative service-level upward boundary |
| `TeamRunService.observeTeamRunLifecycle(teamRunId, listener)` | team execution lifecycle | Observe one team run through the shared lifecycle shape | `teamRunId` | Authoritative service-level upward boundary |
| `ApplicationBoundRunLifecycleGateway.observeBoundRun(bindingRuntime, listener)` | orchestration lifecycle adapter | Normalize agent/team observation to one orchestration-facing shape | `{ runtimeSubject, runId }` | Keeps orchestration free from manager/backend specifics |
| App backend event handlers `runStarted`, `runTerminated`, `runFailed`, `runOrphaned`, `artifact` | application runtime events | Receive normalized runtime events | immutable event envelope with binding summary (`bindingId` + `bindingIntentId`) + concrete run identity | Replaces session lifecycle handlers and supports early-event reconciliation |
| Frontend SDK/request-context helper boundary | browser request source | Preserve app route identity and optional launch instance | `{ applicationId, launchInstanceId? }` | No session-owned business identity |

Rule:
- Do not use one generic boundary when the subject or identity meaning differs.
- Split boundaries by subject or require an explicit compound identity shape.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | `Yes` | `Yes` | `Low` | Keep one authoritative backend-mount base URL rather than parallel per-surface sources of truth |
| `POST /rest/applications/:applicationId/backend/graphql` | `Yes` | `Yes` | `Low` | Keep route `applicationId` authoritative and leave GraphQL schema ownership with the app |
| `ANY /rest/applications/:applicationId/backend/routes/*` | `Yes` | `Yes` | `Low` | Keep transport generic; do not reinterpret app route semantics inside the platform |
| `ApplicationBundleService.getCatalogSnapshot()` | `Yes` | `Yes` | `Low` | Keep startup/host discovery on one best-effort snapshot instead of implicit fatal enumeration |
| `ApplicationResourceConfigurationService.upsertConfiguration(...)` | `Yes` | `Yes` | `Low` | Keep persisted setup separate from run-launch semantics and validate it against manifest-declared slot rules |
| `runtimeControl.getConfiguredResource(...)` | `Yes` | `Yes` | `Low` | Keep setup readback explicit rather than smuggling it through request context or app bootstrap |
| `runtimeControl.startRun(...)` | `Yes` | `Yes` | `Low` | Require `bindingIntentId` for direct start flows and keep `resourceRef` + explicit launch union by resource kind |
| `runtimeControl.getRunBindingByIntentId(...)` | `Yes` | `Yes` | `Low` | Keep intent-based reconciliation on its own explicit boundary |
| `runtimeControl.postRunInput(...)` | `Yes` | `Yes` | `Low` | Keep `bindingId` authoritative |
| `publish_artifact(...)` | `Yes` | `Yes` | `Low` | Identity comes only from injected execution context plus payload |
| `AgentRunService.observeAgentRunLifecycle(...)` | `Yes` | `Yes` | `Low` | Keep run-subject-specific interface |
| `TeamRunService.observeTeamRunLifecycle(...)` | `Yes` | `Yes` | `Low` | Keep team-run-subject-specific interface |
| `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` | `Yes` | `Yes` | `Low` | Keep startup serialization under one dedicated owner |
| `ApplicationOrchestrationStartupGate.awaitReady()` | `Yes` | `Yes` | `Low` | Reuse one clear readiness wait instead of ad hoc route/local locks |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Governing app-facing orchestration owner | `ApplicationOrchestrationHostService` | `Yes` | `Low` | Keep `orchestration` because it truly owns orchestration |
| Primary cross-boundary correlation key | `bindingId` | `Yes` | `Low` | Keep durable platform-owned binding identity as the main correlation handle |
| Durable platform-owned run relationship | `run binding` / `ApplicationRunBindingSummary` | `Yes` | `Low` | Avoid renaming it back toward session |
| Browser-only iframe launch id | `launchInstanceId` | `Yes` | `Low` | Keep it explicitly browser/bootstrap-scoped |
| Single event-ingress owner | `ApplicationExecutionEventIngressService` | `Yes` | `Low` | Prefer this over `PublicationRouter` because it owns lifecycle events too |
| Startup recovery owner | `ApplicationOrchestrationRecoveryService` | `Yes` | `Low` | Makes the restart responsibility explicit |

## Applied Patterns (If Any)

- **Adapter**
  - `ApplicationRuntimeControlBridge` adapts worker-side app code to host-side orchestration service calls.
  - `ApplicationBoundRunLifecycleGateway` adapts agent/team lifecycle observation into one orchestration-facing shape.
- **Repository / Store**
  - binding store, event journal store, and run lookup store are explicit persistence boundaries.
- **Event Loop / Worker Loop**
  - the execution-event dispatch service owns a bounded ack/retry loop.
- **Resolver**
  - resource resolution for bundle-local/shared refs stays as a dedicated resolver under the orchestration owner.
- **Observer**
  - run observer service subscribes to bound run lifecycle and converts it into binding updates plus execution-event ingress calls.
- **Recovery Owner**
  - startup recovery is treated as a first-class owner, not as incidental bootstrapping logic hidden inside another service.
- **Gate / Barrier**
  - `ApplicationOrchestrationStartupGate` serializes live orchestration-sensitive traffic against recovery-time rebuild/reattachment work.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/` | `Folder` | New subsystem | App-facing runtime orchestration core | Replaces mis-scoped `application-sessions` with the correct owner | bundle discovery, generic transport entrypoints |
| `.../domain/models.ts` | `File` | Internal model owner | Internal orchestration model, binding state, execution context | Shared internal shapes for this subsystem | browser contract literals |
| `autobyteus-server-ts/src/application-packages/` | `Folder` | Package-registry boundary | Persist imported package roots/metadata plus package-level diagnostics and package-management flows | Keeps the new package-registry subject concrete instead of spreading it across stores and bundle discovery | app-level catalog entries or orchestration recovery |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | `File` | Governing package-registry boundary | Persist imported package roots/metadata, compute package-level diagnostics, and coordinate import/remove/reload flows | One authoritative owner for package-registry persistence and flows | app-level manifest parsing or orchestration recovery |
| `autobyteus-server-ts/src/application-packages/domain/application-package-registry-snapshot.ts` | `File` | Shared registry snapshot owner | Represent package-root descriptors plus package-level diagnostics | One shared package-registry shape reused by startup and host package-management surfaces | app-level catalog entries or run bindings |
| `autobyteus-server-ts/src/application-bundles/domain/application-catalog-snapshot.ts` | `File` | Discovery snapshot owner | Best-effort valid application entries plus application-level invalid diagnostics | Startup isolation and host app catalog surfaces need one explicit shape distinct from the package-registry snapshot | orchestration policy, package-root persistence, or run bindings |
| `autobyteus-server-ts/src/application-storage/stores/application-platform-state-store.ts` | `File` | Existing-state access boundary | Open existing per-app platform state by storage layout and keep prepared-vs-existing semantics explicit | Recovery/journaling need bundle-independent persisted-state access | manifest parsing or app availability policy |
| `.../services/application-resource-configuration-service.ts` | `File` | Resource-configuration owner | Persist/read app resource-slot setup, validate it against manifest-declared slot declarations, and expose it without creating runs | Host setup and backend readback need one authority | direct run launch policy |
| `.../services/application-availability-service.ts` | `File` | App-availability / re-entry owner | Coordinate targeted app reload success with app-scoped recovery rerun and dispatch resume | Quarantine exit needs one explicit owner | manifest parsing or app business projection |
| `.../stores/application-resource-configuration-store.ts` | `File` | Resource-config persistence boundary | Store selected resource plus launch defaults per app+slot | Durable setup state is one concern | app business-domain projection |
| `.../services/application-orchestration-host-service.ts` | `File` | Authoritative boundary | Public host-side runtime control | One authoritative entrypoint | direct journal writes |
| `.../services/application-orchestration-startup-gate.ts` | `File` | Startup-admission boundary | Exclusive startup serialization and ready/failed release | One startup-coordination concern | recovery domain logic or journal normalization |
| `.../services/application-execution-event-ingress-service.ts` | `File` | Authoritative event-ingress boundary | Normalize artifact/lifecycle events and append immutable journal rows | One ingress owner | app-owned business projection |
| `.../services/application-run-observer-service.ts` | `File` | Lifecycle observer owner | Observe bound-run lifecycle and update bindings | One lifecycle concern | transport/controller code |
| `.../services/application-orchestration-recovery-service.ts` | `File` | Startup recovery owner | Rebuild lookup index and reattach observers on restart | Restart-safe ownership needs a visible owner | ordinary app command handling |
| `.../services/application-bound-run-lifecycle-gateway.ts` | `File` | Thin adapter | Unify agent/team lifecycle observation | One adapter concern | binding persistence or journal append |
| `.../services/application-execution-event-dispatch-service.ts` | `File` | Dispatch owner | Ack/retry loop and startup resume | Bounded local loop deserves one file | resource resolution |
| `.../stores/application-run-binding-store.ts` | `File` | Per-app persistence boundary | Binding rows and binding member rows | Binding persistence is one concern | transport/controller code |
| `.../stores/application-execution-event-journal-store.ts` | `File` | Per-app persistence boundary | Immutable per-app execution-event journal | Journal persistence is one concern | app backend projection logic |
| `.../stores/application-run-lookup-store.ts` | `File` | Global persistence boundary | Derived global `runId/bindingId -> applicationId` lookup | Cross-app index is a distinct concern | per-app journal logic |
| `.../tools/publish-artifact-tool.ts` | `File` | Runtime artifact entry wrapper | Wait for startup gate admission and forward live artifact traffic to the ingress owner | One live artifact ingress entry | direct journal writes |
| `autobyteus-server-ts/src/runtime-management/domain/observed-run-lifecycle-event.ts` | `File` | Shared internal type owner | Shared lifecycle shape above execution owners | Both execution subsystems and orchestration need one shape | app-facing public contracts |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | `File` | Service boundary | Agent run control plus lifecycle observation | Subject-owned boundary should stay here | application binding logic |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | `File` | Internal manager | Active-run registry plus lifecycle listener dispatch | Manager already owns active-run registration | app orchestration policy |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | `File` | Service boundary | Team run control plus lifecycle observation | Subject-owned boundary should stay here | application binding logic |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | `File` | Internal manager | Active-run registry plus lifecycle listener dispatch | Manager already owns active-run registration | app orchestration policy |
| `autobyteus-server-ts/src/application-storage/stores/application-global-platform-state-store.ts` | `File` | Global storage boundary | Open/transaction wrapper for derived global orchestration DB | Cross-app storage path concerns belong under storage | orchestration policy |
| `autobyteus-server-ts/src/server-runtime.ts` | `File` | Startup hook owner | Enter the startup gate, run recovery plus dispatch resume inside it, and fail fast if startup readiness cannot be released | One explicit startup integration point | orchestration domain logic |
| `autobyteus-web/stores/applicationHostStore.ts` | `File` | Browser launch owner | App page readiness without session store | Replaces session-centric store | run launch policy |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | `File` | Shared host type owner | v2 launch/bootstrap contract with authoritative `backendBaseUrl` | One typed bootstrap source | host-specific ad hoc variations |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | `File` | Generic transport helper owner | Schema-agnostic helper for GraphQL/routes/query/command calls against `backendBaseUrl` | Gives apps one reusable hosted-mount helper without owning business schemas | generated app business types |
| `autobyteus-application-sdk-contracts/src/` | `Folder` | Shared contracts | Split contracts by manifest/request/runtime/event/bootstrap subjects | Current single-file index is too mixed | server-only internal store types or app business schemas |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | `File` | Shared manifest-contract owner | `ApplicationManifestV3` including authoritative `resourceSlots` declaration shape | Host setup and bundle validation need one declaration home | server-only reload or dispatch logic |
| `applications/<app>/api/` | `Folder` | App-owned business API contract owner | App-local GraphQL/OpenAPI/shared-contract artifacts | Keeps business schema ownership inside the app | platform runtime internals |
| `applications/<app>/api/graphql/schema.graphql` | `File` | App-owned schema artifact owner | Authoritative GraphQL schema/introspection input for one app | One schema owner per app | platform transport logic |
| `applications/<app>/backend-src/graphql/` | `Folder` | App-owned GraphQL runtime boundary | Resolvers/executor composition for one app | Keeps backend GraphQL ownership inside the app | platform orchestration internals beyond `runtimeControl` |
| `applications/<app>/backend-src/services/run-binding-correlation-service.ts` | `File` | App-owned correlation owner | Persist pending binding intent, finalize mapping, and reconcile early events by `bindingIntentId` | Makes the cross-boundary handoff concrete for real apps | platform-owned routing/recovery internals |
| `applications/<app>/backend-src/repositories/pending-binding-intent-repository.ts` | `File` | App-owned persistence owner | Store pending binding intent rows | Gives the app one durable owner for pre-start intent state | platform-owned business schema packages |
| `applications/<app>/frontend-src/generated/` | `Folder` | App-owned generated-client owner | Generated frontend types/clients for one app | Generated outputs stay with the app that owns the schema | platform-owned business schema packages |
| `applications/brief-studio/` | `Folder` | Sample app | GraphQL-backed sample teaching many runs over one `briefId` business record | Must teach the target model | session-derived business IDs |
| `applications/socratic-math-teacher/` | `Folder` | Sample app | GraphQL-backed sample teaching one long-lived `lessonId` conversational binding | Complements Brief Studio with a different app pattern | bootstrap-only placeholder behavior |

Rules:
- If the design has meaningful structural depth, usually reflect it in folders rather than flattening everything into one mixed directory.
- Do not place transport entrypoints, main-line domain/control nodes, persistence, adapters, and unrelated off-spine concerns in one flat folder when that hides ownership or structural depth.
- A compact layout is acceptable when it remains easy to read for the scope. If you keep it flatter, state why that is the clearer tradeoff.
- Folder boundaries should make ownership and structural depth easier to read, not hide them.
- Shared-layer, feature-oriented, runtime-oriented, and hybrid projections can all be valid when they make the intended ownership and flow easier to understand.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/` | `Main-Line Domain-Control` | `Yes` | `Low` | New subsystem cleanly owns the new main concern replacing sessions |
| `autobyteus-server-ts/src/application-storage/` | `Persistence-Provider` | `Yes` | `Low` | Keep per-app and global orchestration DB bootstrap/path ownership centralized |
| `autobyteus-server-ts/src/application-engine/` | `Main-Line Domain-Control` | `Yes` | `Low` | Already a coherent worker-lifecycle owner |
| `autobyteus-server-ts/src/agent-execution/` and `src/agent-team-execution/` | `Main-Line Domain-Control` | `Yes` | `Low` | Lifecycle observation extensions stay with the execution owners rather than moving into orchestration |
| `autobyteus-web/components/applications/` | `Mixed Justified` | `Yes` | `Medium` | Acceptable because the host-side app surface is relatively compact, but remove session-centric execution subfolder to reduce mixed concerns |
| `autobyteus-application-sdk-contracts/src/` | `Mixed Justified` | `Yes` | `Medium` | Split by subject (`manifests`, `request-context`, `runtime`, `events`, `backend-definition`) instead of one overloaded `index.ts`; do not place app business schemas here |
| `applications/<app>/api/` + `frontend-src/generated/` | `Mixed Justified` | `Yes` | `Low` | This is app-local authoring/build output, not a platform subsystem; it is the correct place for app-owned schema artifacts and generated clients |

## Example App Implementation Shape

| App | Current Teaching Gap | Target App-Owned API Shape | Why It Matters |
| --- | --- | --- | --- |
| `brief-studio` | Teaches session-derived `briefId` and query/command-heavy UI flow | GraphQL-first brief/workflow API with generated client; app metadata declares slots like `draftingTeam` / `reviewTeam`; backend resolvers own `runtimeControl`, read persisted slot config, normalize launches to `autoExecuteTools = true`, persist pending binding intents, and then persist `briefId -> bindingId[]` in app state; the primary UI removes inline model/runtime tuning from the main brief canvas | Teaches how one business record can accumulate many runs over time without losing early events, how host-managed resource setup feeds later orchestration, and how business-first UI differs from runtime-tuning UI |
| `socratic-math-teacher` | Teaches only a shallow runtime-target/bootstrap shape | GraphQL-first lesson/tutor API with generated client; app metadata declares one slot like `lessonTutorTeam`; backend resolvers persist pending binding intent on `startLesson`, read persisted slot config, normalize launches to `autoExecuteTools = true`, then start or reuse one lesson binding and project tutor turns into lesson state; the primary UI stays centered on lesson conversation | Teaches how one business record can own one long-lived conversational binding while depending on persisted host-managed resource setup and auto-approved application-mode execution |

Both apps should keep runnable built payloads in `ui/` and `backend/`, while their richer authoring roots move into app-owned source folders such as `frontend-src/`, `backend-src/`, and `api/`.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Application launch spine | `Browser -> ensure app engine -> iframe bootstrap with backendBaseUrl -> app decides later whether to create runs` | `Browser -> create application session -> auto-create one run -> iframe becomes usable only after run exists` | Shows the main product-model correction |
| Hosted virtual backend mount | `iframe generated client -> /rest/applications/<appId>/backend/graphql (or /routes/...) -> gateway -> worker` | `iframe -> per-app Express server on a separate port` | Shows how apps get real backend surfaces without per-app servers |
| Invalid application isolation at startup | `startup -> best-effort catalog snapshot -> quarantine bad app -> serve valid apps + diagnostics` | `startup -> parse one bad imported manifest -> crash whole server` | Shows the required robustness boundary for optional application packages |
| Persisted application resource configuration | `pre-entry host setup form (prefilled from saved values, shaped like the current team/agent config form) -> save slot config (resource + supported model/runtime/workspace defaults, autoExecuteTools shown but locked true) -> app backend later reads config -> startRun when needed` | `host setup form -> secretly launch run during app open` | Shows how the old form survives with corrected meaning while keeping the business app clean |
| App-owned GraphQL codegen | `app schema.graphql -> generated frontend client in frontend-src/generated -> iframe talks through backendBaseUrl` | `platform inspects app resolvers and emits one universal business-schema package` | Shows how type safety stays with each app |
| App-owned business identity | Brief Studio creates a real `briefId` and stores `briefId -> bindingId[]` in app state; one brief may create many bindings over time | `briefId = brief::<applicationSessionId>` | Shows why business identity must stop deriving from platform session identity |
| Worker runtime-control boundary | `App backend resolver -> runtimeControl.startRun(...) -> ApplicationOrchestrationHostService` | `App backend resolver -> AgentRunService + TeamRunService + stores directly` | Demonstrates the authoritative-boundary rule |
| Direct start-run correlation establishment | `App persists pending binding intent(bindingIntentId) -> startRun(bindingIntentId, ...) -> platform persists binding + echoes bindingIntentId -> early event arrives with same bindingIntentId -> app finalizes or reconciles mapping` | `App calls startRun(...) first and hopes returned bindingId will always be committed to business state before any event arrives` | Shows the exact crash/race-safe handoff that replaces the removed generic business-reference field |
| Brief Studio target sample | `launch app -> pre-entry config gate confirms drafting/runtime/workspace defaults -> Query.brief(briefId)` returns projected brief state -> a business-labeled action such as `Generate draft` starts or restarts drafting from saved slot configuration; approval/rejection stay as business review actions; raw binding/run ids stay in advanced details | `host launch modal picks the team and the app merely reads host-retained execution state` | Teaches the “many runs over one business record” pattern with business-first UI |
| Socratic Math Teacher target sample | `launch app -> pre-entry config gate confirms tutor/runtime/workspace defaults -> Mutation.startLesson` creates the lesson/binding and later `askFollowUp` reuses that binding via `postRunInput`; the lesson UI stays conversation-first and launches use auto-approved tools; raw runtime ids stay secondary | `every question requires host-side relaunch or a brand-new session identity` | Teaches the “long-lived conversational binding” pattern |
| Recovery / resume spine | `Server startup -> recovery service -> authoritative binding store -> rebuild lookup index -> restore active binding -> attach observer -> resume dispatch` | `Server startup -> resume event dispatch only -> wait for first user action to notice that bindings lost observers` | Shows why restart safety needs an explicit recovery owner rather than durable tables alone |
| Event ingress authority | `publish_artifact` and run-observer lifecycle changes both call ApplicationExecutionEventIngressService, which alone writes journal rows` | `publish_artifact -> router` and separately `orchestration host -> journal store directly` | Shows the fix for the authoritative-boundary split |
| Startup traffic / readiness coordination | `server-runtime enters ApplicationOrchestrationStartupGate -> recovery rebuilds state -> dispatch resume starts -> gate releases -> live runtimeControl/publish_artifact traffic proceeds` | `server listens -> live runtimeControl or artifact ingress mutates/lookups while recovery is clearing and rebuilding derived state` | Shows the concrete serialization rule that prevents recovery-time races |

Use this section when the design would otherwise remain too abstract.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `applicationSession` but allow many bound runs inside it | Reuse existing naming/storage/frontend surfaces | `Rejected` | Remove `applicationSession` as governing owner and replace with engine launch + run bindings |
| Keep `runtimeTarget` as an optional “simple path” alongside new orchestration | Preserve current app catalog and host launch modal | `Rejected` | Manifest v3 removes the singular launch-time runtime target requirement entirely |
| Continue sending `applicationSessionId` in request context/bootstrap “for old apps” | Avoid broad SDK/host migration | `Rejected` | Request context v2 is launch-instance-aware at most; no session-owned runtime identity remains |
| Retain platform-owned session projection/streaming alongside app-owned projection | Preserve current host-native execution workspace | `Rejected` | Remove retained session projection as the primary app view and leave domain projection to the app backend |
| Ship dual v1/v2 orchestration behavior as long-term runtime support | Reduce migration pain | `Rejected` | Use staged branch implementation, but the final shipped target removes the legacy path |

Hard block:
- Any design that depends on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior fails review.

## Derived Layering (If Useful)

- **Browser Host Layer**
  - app catalog + engine-ready launch + iframe bootstrap
- **Application Transport / Worker Layer**
  - backend gateway + engine host + worker runtime
- **Application-Orchestration Layer**
  - runtime control, resource resolution, bindings, recovery, lifecycle observation, execution-event ingress, event dispatch
- **Concrete Execution Layer**
  - agent/team run services and runtimes
- **Persistence Layer**
  - app-owned `app.sqlite`, per-app orchestration state, per-app event journals, global derived run lookup index

This layering is explanatory only. Ownership remains the primary design rule.

## Migration / Refactor Sequence

1. **Contract-first branch change**
   - introduce manifest v3 + backend definition/runtime event/request-context v2 contracts,
   - add shared runtime orchestration types (resource refs, binding summary including opaque `bindingIntentId`, event envelope, and intent-based reconciliation lookup),
   - extend `ApplicationManifestV3` with authoritative `resourceSlots` declaration metadata plus validation rules,
   - add iframe/bootstrap transport descriptor changes with authoritative `backendBaseUrl`, and
   - keep platform SDK/contract types schema-agnostic.

2. **Backend mount / frontend transport helpers**
   - make the hosted backend mount the explicit authoritative frontend/backend boundary,
   - keep `/graphql`, `/routes/*`, `/queries/:queryName`, and `/commands/:commandName` under that mount,
   - add optional generic frontend SDK helpers around `backendBaseUrl` + request-context v2.

3. **Server orchestration core**
   - add `application-orchestration` subsystem,
   - add per-app binding store and per-app execution-event journal store,
   - add persisted application resource-configuration store/service,
   - add derived global run lookup store,
   - add execution-event ingress owner, run observer owner, and recovery owner.

4. **Execution-owner lifecycle extensions**
   - add shared internal observed lifecycle type,
   - extend agent/team run managers with lifecycle subscription/dispatch,
   - expose service-level `observe...Lifecycle(...)` methods,
   - add `ApplicationBoundRunLifecycleGateway`.

5. **Worker/engine bridge**
   - extend engine IPC protocol,
   - inject `runtimeControl` into worker handler/lifecycle context,
   - expose worker-side orchestration calls through one authoritative bridge.

6. **Startup integration**
   - add `ApplicationOrchestrationStartupGate`,
   - extend `server-runtime.ts` to run orchestration startup inside `ApplicationOrchestrationStartupGate.runStartupRecovery(...)`,
   - call `ApplicationOrchestrationRecoveryService.resumeBindings()` first inside that gate,
   - then call `ApplicationExecutionEventDispatchService.resumePendingEvents()`,
   - release ready only after both succeed, and
   - treat only shared-store / startup-gate failure as fatal rather than one app-specific recovery problem.

7. **Backend gateway / host launch**
   - add explicit ensure-ready surface,
   - migrate iframe bootstrap to v2 with authoritative `backendBaseUrl`,
   - remove session launch/binding GraphQL dependency from the web host.

8. **Concrete package-registry ownership**
   - tighten the current package-management subsystem into `ApplicationPackageRegistryService`,
   - route imported package persistence, package diagnostics, and package remove/reload flows through that boundary, and
   - make bundle discovery consume package-root descriptors from the registry boundary instead of reading stores directly.

9. **Application discovery failure isolation**
   - make bundle discovery/cache refresh produce a best-effort application catalog snapshot plus separate package-registry diagnostics,
   - quarantine invalid/missing/incompatible applications instead of throwing fatally,
   - surface missing package roots explicitly instead of letting them disappear from discovery, and
   - make recovery/dispatch iterate valid apps plus known durable app ids without crashing on invalid package content.

10. **Bundle-independent persisted platform state access + startup inventory**
   - split prepared active-app storage creation from existing persisted-state access,
   - update binding/journal stores plus event ingress to use existing-state access where the app is already known,
   - make `ApplicationPlatformStateStore` the authoritative `listKnownApplicationIds()` / `getExistingStatePresence(...)` boundary, and
   - define `NO_PERSISTED_STATE` admission behavior through `ApplicationAvailabilityService`.

11. **Quarantined-app repair/reload re-entry**
   - add `ApplicationAvailabilityService`,
   - add targeted `ApplicationBundleService.reloadApplication(applicationId)` behavior,
   - rerun one app-scoped recovery slice plus dispatch resume before leaving quarantine, and
   - make backend/runtime-control/event-dispatch behavior explicit while one app is `REENTERING`.

12. **Direct-start correlation establishment**
   - add `bindingIntentId` to `runtimeControl.startRun(...)`, binding summaries, and event envelopes,
   - add authoritative `getRunBindingByIntentId(...)` reconciliation lookup,
   - document the required app-owned pending binding intent pattern.

13. **App-owned API/schema authoring path**
   - add app-local folder guidance for schema artifacts and generated clients,
   - keep app-generated clients out of platform packages,
   - ensure GraphQL-backed and route-backed apps remain first-class.

14. **Sample app upgrades**
   - migrate Brief Studio to an app-owned GraphQL schema plus generated frontend client,
   - use real `briefId` business identity and app-owned `briefId -> bindingId[]` mapping,
   - move model/runtime/workspace concerns into the pre-entry host configuration gate,
   - remove inline model/runtime tuning from the Brief Studio main canvas and rely on saved slot configuration instead,
   - migrate Socratic Math Teacher to an app-owned GraphQL lesson API plus generated frontend client,
   - keep the lesson UI conversation-first and teach long-lived lesson binding plus repeated `postRunInput(...)` follow-up flow,
   - normalize both sample apps' launches to `autoExecuteTools = true`,
   - let the simple first-cut host UX show the pre-entry config form on each launch with saved values prefilled.

15. **Frontend host simplification + resource setup repurpose**
   - remove session store, retained execution workspace, and session query-param binding,
   - add `applicationHostStore` and engine-first iframe launch behavior,
   - repurpose the old launch modal/form into persisted application resource configuration instead of deleting the useful setup UX.

16. **Legacy deletion**
   - remove `application-sessions` subsystem,
   - remove session GraphQL/WS/public types,
   - remove `runtimeTarget`-driven host UI and docs,
   - remove v1 iframe bootstrap doc/types after all in-repo callers are migrated.

Temporary seams inside the branch are acceptable only as implementation scaffolding.
The shipped end state must not retain legacy dual-path behavior.

## Key Tradeoffs

- **Clean-cut replacement vs incremental extension**
  - Chosen: clean-cut replacement.
  - Why: extending `applicationSession` would preserve the wrong governing abstraction.

- **App-owned projection vs host-owned retained projection**
  - Chosen: app-owned projection.
  - Why: the user-facing business meaning belongs to the application backend, not to a generic platform-retained session snapshot.

- **Worker-side orchestration via bridge vs direct host/service access**
  - Chosen: bridge.
  - Why: preserves clear boundaries and avoids boundary bypass from worker code into host internals.

- **Per-app authoritative binding state + derived global lookup index vs pure global authority**
  - Chosen: per-app authoritative store plus derived global lookup index.
  - Why: per-app state keeps application ownership clear, while the derived global index keeps runtime-originated event routing efficient and rebuildable.

- **Eager recovery of nonterminal bindings vs lazy reattachment on first use**
  - Chosen: eager recovery.
  - Why: lifecycle/publication guarantees are not trustworthy if observers are missing after restart until some later touch path happens.

- **Explicit startup gate vs relying only on pre-`listen()` completion**
  - Chosen: explicit startup gate.
  - Why: correctness should not depend on raw socket-bind timing, and the current runtime may still need to bind/listen before some non-orchestration startup tasks complete.

- **Binding-centric correlation vs platform-owned generic business-reference field**
  - Chosen: binding-centric correlation.
  - Why: the platform needs durable routing/recovery by binding identity, while business-record meaning belongs in app-owned state.

- **Pending intent + reconciliation vs deferred app-visible event delivery**
  - Chosen: pending intent + reconciliation.
  - Why: it keeps the platform event model simple and durable while giving the app one explicit crash/race-safe handoff contract.

- **Best-effort invalid-application quarantine vs fatal startup on discovery failure**
  - Chosen: best-effort quarantine.
  - Why: application packages are optional content/extensions; one bad manifest or stale import path must not make AutoByteus itself unusable.

- **Per-app hot re-entry vs restart-only recovery for repaired invalid apps**
  - Chosen: per-app hot re-entry.
  - Why: the product promise is that broken optional apps are repairable in place; forcing full restart would preserve the wrong operational boundary.

- **Manifest-declared resource slots vs backend-inferred or host-only slot metadata**
  - Chosen: manifest-declared resource slots.
  - Why: host setup and persisted-config validation need pre-worker metadata with one authoritative bundle-owned source of truth.

- **App-owned business schema vs platform-owned universal business schema**
  - Chosen: app-owned business schema.
  - Why: the platform should host and route applications, not reinterpret their business meaning.

- **Hosted virtual backend mount vs per-app HTTP server**
  - Chosen: hosted virtual backend mount.
  - Why: keeps deployment/runtime ownership centralized while still giving each app a real backend API namespace.

- **GraphQL/routes as first-class app choices vs query/command-only teaching model**
  - Chosen: GraphQL/routes remain first-class; queries/commands stay optional conveniences.
  - Why: real apps need schema/codegen freedom and should not be forced into one transport style.

- **Upgrade sample apps in-scope vs leave them as historical/thin demos**
  - Chosen: upgrade them in-scope.
  - Why: leaving the old samples unchanged would keep teaching the wrong ownership and API model.

- **Removing host run-launch semantics vs reusing the existing configuration form**
  - Chosen: remove host run-launch semantics but reuse the form as persisted resource configuration.
  - Why: the UX for configuring agent/team resources is useful; the ownership bug was the implicit launch-now behavior, not the existence of a setup surface.

- **Application-mode auto-approved tool execution vs host-exposed manual approval toggle**
  - Chosen: auto-approved tool execution for the generic host-managed application flow in this ticket.
  - Why: the host and sample apps do not own a per-tool mid-run approval loop, so a manual toggle would be misleading dead UI.

## Risks

- The worker->host orchestration bridge must stay disciplined and must not become a generic service locator.
- Execution-owner lifecycle extensions must be implemented consistently across agent and team paths; otherwise the recovery/observer story weakens again.
- Removing the host-native retained execution workspace is architecturally correct, but product stakeholders should expect the browser host to feel simpler and more app-first afterward.
- Shared resource authorization remains open and should not be smuggled into this design as accidental hardcoded policy.
- Repair/reload behavior for quarantined invalid applications must be implemented carefully so durable bindings/events resume cleanly after the app is fixed; `ApplicationAvailabilityService` should remain the only owner allowed to move an app back to `ACTIVE`.
- In-repo app/sample migration is mandatory; otherwise the codebase will keep teaching the old model.

## Guidance For Implementation

- Start with shared contract/types design; the server, web host, and SDK migrations all depend on that vocabulary being correct.
- Keep `backendBaseUrl` authoritative in iframe bootstrap v2; derive GraphQL/query/command/route URLs from it instead of creating parallel sources of truth.
- Keep frontend SDK helpers schema-agnostic. They may help apps talk to the hosted backend mount, but they must not own app business DTOs or generated clients.
- Implement `bindingIntentId` as an opaque intent token, not as a generic business-reference field. Its only job is to make the direct-start handoff durable and reconcilable.
- Keep app-owned GraphQL/OpenAPI/shared-contract artifacts inside each application workspace and generate frontend clients there during the app build.
- Implement execution-event ingress, lifecycle gateway, recovery, and invalid-application quarantine before removing session paths. Those owners define whether the new orchestration core is truly restart-safe.
- Ensure `ApplicationOrchestrationHostService` persists `bindingIntentId` on the binding before journaling explicit `runStarted` events, and ensure ingress copies it into event envelopes.
- Implement best-effort application catalog snapshotting so one bad imported/bundled app cannot crash startup; quarantine invalid apps as diagnostics and keep their durable state repairable.
- Implement `ApplicationAvailabilityService` together with targeted bundle reload and app-scoped recovery/dispatch re-entry; do not let browser host code improvise quarantine exit on its own.
- Implement `ApplicationOrchestrationStartupGate` together with recovery and ingress wiring; startup safety is incomplete until live `runtimeControl` and live artifact ingress both honor the same gate.
- Keep `runtimeControl` narrow and subject-owned. If an app asks for more power, add it to the orchestration boundary rather than bypassing it.
- Repurpose the existing host launch form into a pre-entry resource-configuration gate and remove any code path that starts runs from that host setup surface.
- Keep the teaching apps' main canvases business-first: move runtime/model/workspace setup into the pre-entry host gate, remove inline model/runtime tuning from Brief Studio and similar sample UIs, keep domain review actions like `approveBrief` / `rejectBrief` because they are business workflow rather than execution approval, and move raw binding/run ids plus execution diagnostics into optional advanced panels.
- In the Applications catalog, make the primary card describe the app and whether setup is needed; move `Agent team` badges and bundle-resource ids into details or developer-focused surfaces.
- Make `ApplicationManifestV3.resourceSlots` authoritative before building host setup UI; parse once in bundle discovery, validate writes against it in `ApplicationResourceConfigurationService`, and do not infer slot metadata from backend code at runtime.
- Let applications read persisted resource-slot configuration through one authoritative platform boundary rather than through iframe bootstrap hacks or host-owned business state.
- Reuse existing `AgentRunService` / `TeamRunService` as the execution-resource layer; do not push app-owned binding logic downward into them.
- When migrating Brief Studio, use a real `briefId` as business identity, expose GraphQL as the primary app business API, declare persisted resource slots such as `draftingTeam`, collect/confirm runtime/model/workspace values in the pre-entry host gate, remove the inline LLM model field from the main brief canvas, rename raw runtime actions like `Launch draft run` into business wording such as `Generate draft`, keep `Approve` / `Reject` as business review actions, persist pending binding intent before launch, normalize launches to `autoExecuteTools = true`, and then persist app-owned `briefId -> bindingId[]` mapping while moving binding/run ids to advanced details.
- When migrating Socratic Math Teacher, teach a lesson-centric GraphQL flow whose `startLesson` path persists pending binding intent before creation, reads a configured tutor slot plus saved runtime/model/workspace defaults from the pre-entry host gate, normalizes launches to `autoExecuteTools = true`, and whose follow-up mutations reuse one binding via `runtimeControl.postRunInput(...)` while keeping raw runtime ids in advanced details only.
- Remove legacy code aggressively once the new path is integrated; do not leave `applicationSession` or `runtimeTarget` as parallel long-term shapes.
