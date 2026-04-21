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
- `components/applications/ApplicationLaunchDefaultsFields.vue`
- `utils/application/applicationAssetUrl.ts`
- `utils/application/applicationHostTransport.ts`
- `utils/application/applicationLaunchDescriptor.ts`
- `types/application/ApplicationHostTransport.ts`
- `types/application/ApplicationIframeContract.ts`
- `docs/application-bundle-iframe-contract-v1.md`

## Runtime Availability And Gating

Applications availability is resolved from a backend-owned per-node capability.

- `applicationsCapabilityStore` resolves whether Applications are enabled for the currently bound node.
- navigation surfaces show or hide the Applications module from that store.
- `middleware/feature-flags.global.ts` redirects away from `/applications` when the bound node says Applications is unavailable.
- `applicationStore` clears cached catalog state when capability resolution changes or the bound node changes.

This means two windows bound to different nodes can legitimately show different Applications visibility at the same time.

## Catalog Model

`applicationStore` owns the fetched application catalog.

Each application entry carries:

- stable application id
- local application id
- owning `packageId`
- name and description
- transport-neutral `iconAssetPath` and `entryHtmlAssetPath`
- `writable` source metadata
- bundled runtime resources exposed as `bundleResources[]`
- manifest-declared setup requirements exposed as `resourceSlots[]`

The generic host no longer treats one singular bundle resource as the required launch-time runtime target. The catalog exposes what the bundle contains; application backends decide if and when to use those resources.

`ApplicationCard.vue` uses the same authoritative `resourceSlots[]` contract to summarize host-managed setup requirements on the primary `/applications` surface. The catalog should describe required setup work in business-facing language (for example, required setup-item counts) instead of leaking raw runtime-resource ids as the primary card message.

The store also owns stale-response protection for node switches: late catalog or detail responses from the old bound node are discarded instead of repopulating stale application state after `bindingRevision` changes.

## Host Launch Flow

`pages/applications/[id].vue` stays intentionally thin and delegates page behavior to `ApplicationShell.vue`.

On route load, the shell:

1. fetches the application entry if needed,
2. renders the authoritative `ApplicationLaunchSetupPanel` when the application declares `resourceSlots[]`,
3. blocks entry until the saved setup is launch-ready for every required slot,
4. asks `applicationHostStore.startLaunch(applicationId)` to prepare the app backend only after that gate is satisfied, and
5. renders `ApplicationSurface.vue` once the host launch reaches `ready`.

`applicationHostStore` is the authoritative owner for the generic host-side launch state:

- `idle`
- `preparing`
- `ready`
- `failed`

The host launch is intentionally narrow. It does **not** create an agent run or team run. It only ensures the application backend is ready and produces one ephemeral `launchInstanceId` for iframe bootstrap correlation.

## Pre-Entry Launch Setup Gate

`ApplicationShell.vue` is also the owner for the pre-entry gate shown on `/applications/:id`.

That gate:

- loads the application's declared `resourceSlots[]` contract and current saved setup,
- lets the user save required runtime-resource and launch-default selections before entry,
- keeps `Enter application` disabled while setup is loading, saving, dirty, or missing required saved state, and
- only allows host launch after the setup panel reports `launch-ready`.

`ApplicationLaunchSetupPanel.vue` owns the overall setup orchestration UI. It loads the saved slot state, owns refresh/save/reset actions, and surfaces:

- required vs optional slots, and
- bundled vs shared runtime-resource choices.

`ApplicationLaunchDefaultsFields.vue` owns the slot-specific launch-defaults boundary. It surfaces:

- saved launch defaults such as runtime kind, model identifier, and workspace root only when the current slot supports them, and
- the host-managed note that automatic tool execution remains enabled for this application flow.

That split is intentional: application-specific field-presence policy now lives in the app-owned launch-defaults boundary instead of extending the shared run-config wrapper with app-specific visibility toggles. Native agent/team run configuration keeps its own stable runtime/model field semantics.

This means the authoritative user journey is now:

`Applications card -> launch setup save -> Enter application -> iframe bootstrap -> app-owned run creation`.

## Application Surface Ownership

`ApplicationSurface.vue` is the authoritative host launch owner once `applicationHostStore` returns a ready launch.

It owns:

- the immutable iframe launch descriptor for the current app + launch instance
- ready timeout / retry / remount logic
- acceptance of the matching child ready signal
- delivery of the bootstrap envelope into the iframe

`ApplicationIframeHost.vue` is an internal bridge only. It renders the iframe, validates the raw ready message against the current iframe window/origin/application/launch identity, and posts the supplied bootstrap envelope back to the iframe.

## Iframe Bootstrap v2

The host resolves `entryHtmlAssetPath` against the bound REST base, appends the versioned iframe launch hints, and bootstraps the child iframe only after it receives the matching ready event.

The v2 contract uses:

- `autobyteusContractVersion`
- `autobyteusApplicationId`
- `autobyteusLaunchInstanceId`
- `autobyteusHostOrigin`

The v2 bootstrap payload contains:

- `host.origin`
- `application { applicationId, localApplicationId, packageId, name }`
- `launch { launchInstanceId }`
- `requestContext { applicationId, launchInstanceId }`
- `transport` with host and app-backend gateway URLs

The payload intentionally does **not** contain a platform-owned execution id, session id, or prelaunched runtime summary.

## Backend Gateway And SDK Boundary

Bundled UIs should usually sit on top of `@autobyteus/application-frontend-sdk`, not on raw `postMessage` payloads alone.

The public author-facing surface is:

- `@autobyteus/application-sdk-contracts` for shared manifest, request-context, storage, runtime-control, and execution-event types
- `@autobyteus/application-frontend-sdk` for app UI query/command/GraphQL/notification helpers
- `@autobyteus/application-backend-sdk` for backend definition typing
- `application-bundle-iframe-contract-v1.md` plus `ApplicationIframeContract.ts` for the host bootstrap envelope itself

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

- `application-bundle-iframe-contract-v1.md`
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
