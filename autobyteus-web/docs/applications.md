# Applications Module - Frontend

## Scope

Shows Applications as a first-class top-level module, resolves whether the module is available from a backend-owned per-node runtime capability, launches the generic application shell without creating a platform-owned execution, hosts bundled application UIs inside the iframe surface, and lets each application backend own its own runtime orchestration.

## Main Files

- `pages/applications/index.vue`
- `pages/applications/[id].vue`
- `stores/applicationsCapabilityStore.ts`
- `stores/applicationStore.ts`
- `stores/applicationHostStore.ts`
- `middleware/feature-flags.global.ts`
- `components/applications/ApplicationCard.vue`
- `components/applications/ApplicationShell.vue`
- `components/applications/ApplicationSurface.vue`
- `components/applications/ApplicationIframeHost.vue`
- `components/applications/ApplicationImmersiveControlPanel.vue`
- `components/applications/setup/ApplicationResourceSlotEditor.vue`
- `components/applications/setup/ApplicationAgentLaunchProfileEditor.vue`
- `components/applications/setup/ApplicationTeamLaunchProfileEditor.vue`
- `components/applications/setup/ApplicationWorkspaceRootSelector.vue`
- `utils/application/applicationAssetUrl.ts`
- `utils/application/applicationHostTransport.ts`
- `utils/application/applicationLaunchDescriptor.ts`
- `utils/application/applicationLaunchProfile.ts`
- `utils/application/applicationSetupGate.ts`
- `utils/teamLaunchReadinessCore.ts`
- `docs/application-bundle-iframe-contract-v3.md`
- `../../autobyteus-application-sdk-contracts/src/application-iframe-contract.ts`

## Runtime Availability And Gating

Applications availability is resolved from a backend-owned per-node capability.

- `applicationsCapabilityStore` resolves whether Applications are enabled for the currently bound node.
- navigation surfaces show or hide the Applications module from that store.
- `middleware/feature-flags.global.ts` redirects away from `/applications` when the bound node says Applications is unavailable.
- `applicationStore` clears cached catalog state when capability resolution changes or the bound node changes.

This means two windows bound to different nodes can legitimately show different Applications visibility at the same time.

## Catalog Model

`applicationStore` owns the fetched application catalog and keeps the default catalog projection intentionally presentation-safe.

Each catalog entry carries only:

- stable application id
- name and description
- transport-neutral `iconAssetPath` and `entryHtmlAssetPath`
- manifest-declared setup requirements exposed as `resourceSlots[]`

The detail fetch extends that catalog record with `technicalDetails`, which contains:

- local application id
- owning `packageId`
- `writable` source metadata
- bundled runtime resources exposed as `bundleResources[]`

That split is intentional: internal bootstrap/package identifiers remain available for iframe bootstrap and diagnostics, but the normal catalog/setup path should not casually render them.

The generic host no longer treats one singular bundle resource as the required launch-time runtime target. The catalog exposes what the bundle contains; application backends decide if and when to use those resources.

`ApplicationCard.vue` uses the same authoritative `resourceSlots[]` contract to summarize host-managed setup requirements on the primary `/applications` surface. The catalog should describe required setup work in business-facing language (for example, required setup-item counts) instead of leaking raw runtime-resource ids as the primary card message.

The store also owns stale-response protection for node switches: late catalog or detail responses from the old bound node are discarded instead of repopulating stale application state after `bindingRevision` changes.

## Two-Phase Route Flow

`pages/applications/[id].vue` stays intentionally thin and delegates page behavior to `ApplicationShell.vue`.

On route load, the shell always starts in a setup-focused phase:

1. fetches the application entry if needed,
2. clears any stale host-launch state for that route visit,
3. renders the authoritative `ApplicationLaunchSetupPanel`,
4. blocks entry until the saved setup is launch-ready for every required slot, and
5. only starts a fresh host launch when the user explicitly clicks `Enter application`.

Once the user commits to entry, the route switches into an immersive phase:

1. `ApplicationShell.vue` requests `appLayoutStore.setHostShellPresentation('application_immersive')`,
2. `applicationHostStore.startLaunch(applicationId)` creates a fresh host launch generation for that route visit,
3. the shell shows immersive loading/error canvas states until an `iframeLaunchId` exists, and
4. `ApplicationSurface.vue` owns the iframe/bootstrap lifecycle once the fresh `iframeLaunchId` is ready.

`applicationHostStore` is the authoritative owner for the generic host-side launch state:

- `idle`
- `preparing`
- `ready`
- `failed`

The host launch is intentionally narrow. It does **not** create an agent run or team run. It only ensures the application backend is ready and produces one ephemeral `iframeLaunchId` for iframe bootstrap correlation.

## Host Launch Lifetime Contract

The application route now uses a route-visit-scoped, setup-agnostic host-launch contract:

- `Enter application` always creates a fresh host launch for the current route visit.
- `Reload application` is the only in-route action that intentionally replaces the current host launch with a fresh one.
- `Exit application` and route leave both call `applicationHostStore.clearLaunchState(applicationId)` and restore the standard host shell presentation.
- Post-entry setup saves do **not** relaunch and do **not** clear host-launch state. If the user wants a fresh iframe/app-shell bootstrap after saving setup, they must use explicit `Reload application`.

This keeps host-launch identity tied to route visit and explicit reload/exit semantics instead of mixing setup fingerprints into `applicationHostStore`.

## Pre-Entry Launch Setup Gate

`ApplicationShell.vue` is also the owner for the pre-entry gate shown on `/applications/:id`.

That gate:

- loads the application's declared `resourceSlots[]` contract and current saved setup,
- keeps technical metadata hidden behind an explicit toggle by default,
- lets the user save required runtime-resource and launch-profile selections before entry,
- keeps `Enter application` disabled while setup is loading, saving, dirty, or missing required saved state, and
- only allows host launch after the setup panel reports `launch-ready`.

`ApplicationLaunchSetupPanel.vue` owns the overall setup orchestration UI. It loads the saved slot state, owns refresh/save/reset actions, and surfaces:

- required vs optional slots, and
- bundled vs shared runtime-resource choices,
- configuration-view issues such as invalid saved topology or unsupported persisted profile fields, and
- the host-managed note that automatic tool execution remains enabled for this application flow.

`ApplicationResourceSlotEditor.vue` owns the slot-local editor choice:

- `ApplicationAgentLaunchProfileEditor.vue` saves the agent-shaped `launchProfile` fields (`runtimeKind`, `llmModelIdentifier`, `workspaceRootPath`) only when the selected slot declares them under `supportedLaunchConfig.AGENT`.
- `ApplicationTeamLaunchProfileEditor.vue` saves the team-shaped `launchProfile`: shared defaults plus the current member override rows for runtime/model when the slot declares them under `supportedLaunchConfig.AGENT_TEAM`.
- `ApplicationWorkspaceRootSelector.vue` keeps workspace-root path selection consistent across the agent and team editors.

The persisted contract is now `launchProfile`, not the older flat `launchDefaults` record. The frontend draft helpers in `applicationLaunchProfile.ts` and `applicationSetupGate.ts` keep the route gate aligned with that kind-aware contract while the server handles legacy row migration.

## Immersive Control Panel

After entry, the default visible state is immersive and app-first. The outer host shell is suppressed through the existing `appLayoutStore -> layouts/default.vue` boundary, while a light top-right in-app host trigger remains available.

`ApplicationImmersiveControlPanel.vue` owns that focused immersive chrome. It:

- exposes the light top-right trigger,
- opens a resizable right-side panel that narrows the application canvas instead of restoring the old stacked host page,
- keeps the embedded setup controls usable even at narrower panel widths,
- expands `Details` and `Configure` inline inside that same panel, with technical details still hidden until explicitly opened, and
- emits explicit route-level actions such as `Reload application` and `Exit application`.

The configure disclosure reuses `ApplicationLaunchSetupPanel.vue` through a presentation variant, so setup semantics stay authoritative in one owner across both route phases.

This means the authoritative user journey is now:

`Applications card -> setup-first route -> launch setup save -> Enter application -> immersive shell -> iframe bootstrap -> app-owned run creation`.

## Application Surface Ownership

`ApplicationSurface.vue` is the authoritative host launch owner once `applicationHostStore` returns a ready launch.

It owns:

- the immutable iframe launch descriptor for the current app + iframe bootstrap id
- ready timeout / retry / remount logic
- acceptance of the matching child ready signal
- delivery of the bootstrap envelope into the iframe
- the host-side reveal boundary, which still completes on bootstrap delivery

`ApplicationIframeHost.vue` is an internal bridge only. It renders the iframe, validates the raw ready message against the current iframe window/origin/application/iframe launch identity, and posts the supplied bootstrap envelope back to the iframe.

Inside the bundle, `startHostedApplication(...)` from `@autobyteus/application-frontend-sdk` becomes the authoritative bundle-local startup owner. It owns:

- launch-hint parsing
- unsupported raw-entry behavior
- ready emission
- bootstrap payload validation
- local startup while runtime context is created
- startup failure containment until the business mount callback completes successfully

Direct/raw bundle entry without valid host launch context is intentionally unsupported by that startup boundary rather than left to app-authored placeholder UI.

## Iframe Bootstrap v3

The host resolves `entryHtmlAssetPath` against the bound REST base, appends the versioned iframe launch hints, and bootstraps the child iframe only after it receives the matching ready event.

The shared contract definitions live in `@autobyteus/application-sdk-contracts`.

The v3 query contract uses:

- `autobyteusContractVersion=3`
- `autobyteusApplicationId`
- `autobyteusIframeLaunchId`
- `autobyteusHostOrigin`

The v3 bootstrap payload contains:

- `host.origin`
- `application { applicationId, localApplicationId, packageId, name }`
- top-level `iframeLaunchId`
- `requestContext { applicationId }`
- `transport` with host and app-backend gateway URLs

The payload intentionally does **not** contain a platform-owned execution id, session id, app instance id, or prelaunched runtime summary. The iframe launch id is only an ephemeral bootstrap correlation id.

## Backend Gateway And SDK Boundary

Bundled UIs should usually sit on top of `@autobyteus/application-frontend-sdk`, not on raw `postMessage` payloads alone.

The public author-facing surface is:

- `@autobyteus/application-sdk-contracts` for shared manifest, request-context, storage, runtime-control, and execution-event types
- `@autobyteus/application-frontend-sdk` for framework-owned startup plus app UI query/command/GraphQL/notification helpers
- `@autobyteus/application-backend-sdk` for backend definition typing
- `application-bundle-iframe-contract-v3.md` plus the shared `application-iframe-contract.ts` contract owner for the host bootstrap envelope itself

App UIs call their own backend through the platform-owned application backend gateway URLs delivered in `transport`.

## Ownership Boundary

The generic host owns:

- catalog fetch
- capability gating
- app-backend ensure-ready
- iframe bootstrap delivery
- host launch retries

The application backend owns:

- business identifiers and pending binding intents
- when to start runs
- which configured runtime resource slot to use after the host saves setup
- how runtime outputs project into app-owned state

This separation is the core architectural change: the Applications page launches applications, not platform-owned application executions.

## Package Refresh Behavior

`applicationPackagesStore` invalidates and reloads Applications, Agents, and Agent Teams together after application-package import or removal so bundle-owned apps and definitions refresh in the same session without a manual reload.

## Related Docs

- `application-bundle-iframe-contract-v3.md`
- `agent_management.md`
- `agent_teams.md`
- `settings.md`
- `../../autobyteus-server-ts/docs/modules/application_capability.md`
- `../../autobyteus-server-ts/docs/modules/applications.md`
- `../../autobyteus-server-ts/docs/modules/application_backend_gateway.md`
- `../../autobyteus-server-ts/docs/modules/application_engine.md`
- `../../autobyteus-server-ts/docs/modules/application_storage.md`
- `../../autobyteus-application-sdk-contracts/README.md`
- `../../autobyteus-application-frontend-sdk/README.md`
- `../../autobyteus-application-backend-sdk/README.md`
