# Applications Module - Frontend

## Scope

Shows Applications as a first-class top-level module, resolves whether the module is available from a backend-owned per-node runtime capability, prepares launch drafts from bound runtime definitions, binds `/applications/[id]` to backend-owned durable application sessions, hosts bundled application UIs inside the generic iframe shell, and renders a native Execution view from retained application/member projections.

## Main Files

- `pages/applications/index.vue`
- `pages/applications/[id].vue`
- `stores/applicationsCapabilityStore.ts`
- `stores/applicationStore.ts`
- `stores/applicationSessionStore.ts`
- `stores/applicationPageStore.ts`
- `middleware/feature-flags.global.ts`
- `components/applications/ApplicationCard.vue`
- `components/applications/ApplicationLaunchConfigModal.vue`
- `components/applications/ApplicationShell.vue`
- `components/applications/ApplicationSurface.vue`
- `components/applications/ApplicationIframeHost.vue`
- `components/applications/execution/ApplicationExecutionWorkspace.vue`
- `services/applicationStreaming/ApplicationSessionStreamingService.ts`
- `services/workspace/workspaceNavigationService.ts`
- `composables/workspace/useWorkspaceRouteSelection.ts`
- `utils/application/applicationLaunch.ts`
- `utils/application/applicationAssetUrl.ts`
- `utils/application/applicationSessionTransport.ts`
- `types/application/ApplicationSession.ts`
- `types/application/ApplicationIframeContract.ts`
- `types/workspace/WorkspaceExecutionLink.ts`
- `docs/application-bundle-iframe-contract-v1.md`

## Runtime Availability And Gating

Applications availability is no longer controlled by a baked `runtimeConfig.public.enableApplications` flag.

Instead:

- `applicationsCapabilityStore` resolves the typed runtime Applications capability for the current bound node,
- `AppLeftPanel.vue` and `LeftSidebarStrip.vue` show or hide the top-level Applications nav item from that store,
- `middleware/feature-flags.global.ts` redirects away from `/applications` when the bound node says Applications is unavailable, and
- `applicationStore` waits for capability resolution and clears cached catalog state when the capability is disabled, unresolved, or the bound node changes.

This means two windows bound to different nodes can legitimately show different Applications visibility at the same time.

## Catalog Model

`applicationStore` owns the fetched application catalog.

Each application entry carries:

- stable application id,
- local application id,
- owning `packageId`,
- name and description,
- transport-neutral `iconAssetPath` and `entryHtmlAssetPath`,
- `writable` source metadata, and
- a bound runtime target (`AGENT` or `AGENT_TEAM`) with a canonical `definitionId`.

The frontend does not receive host-usable absolute URLs from the backend. It resolves asset paths against the currently bound REST base at render time.

The store also owns stale-response protection for node switches: late catalog or detail responses from the old bound node are discarded instead of repopulating stale application state after `bindingRevision` changes.

## Route Shell And Binding Flow

`pages/applications/[id].vue` is intentionally thin and delegates page behavior to `ApplicationShell.vue`.

On route load, the shell:

1. fetches the application entry if needed,
2. reads the optional `applicationSessionId` query,
3. calls `applicationSessionStore.bindApplicationRoute(applicationId, requestedSessionId?)`, and
4. canonicalizes the route query to the backend-resolved live session id.

Backend binding outcomes are surfaced directly in the UI:

- `requested_live`: the requested session is still the live bound session.
- `application_active`: the requested session is gone, so the page reattaches to the current live session for that application.
- `none`: no live session exists for that application right now.

`applicationPageStore` keeps page-local UI state such as the current `application` vs `execution` mode and the selected member route key.

## Launch And Session Flow

1. `applicationStore` fetches catalog entries.
2. `applicationSessionStore.prepareLaunchDraft()` loads the bound application plus the required agent/team definitions.
3. Launch defaults come from agent definition `defaultLaunchConfig` values:
   - single-agent apps seed directly from the bound agent,
   - team apps derive global defaults plus per-member overrides from the resolved leaf agents.
4. `ApplicationLaunchConfigModal.vue` lets the user review/override the launch configuration before runtime creation.
5. `applicationSessionStore.createApplicationSession()` calls the backend mutation, which creates the underlying run, persists one authoritative application session, and replaces any previous live session for the same application.
6. The store caches the returned snapshot, updates the active-session index from backend truth only, and attaches the application-session WebSocket stream.
7. `ApplicationShell.vue` becomes the page-shell owner for the live session: it keeps the default Application view app-first, switches between Application vs Execution modes, and hides operational metadata behind an explicit details surface.
8. `ApplicationSurface.vue` and `ApplicationExecutionWorkspace.vue` render from the bound session snapshot.

The frontend is a cache/orchestration owner over backend-authoritative session state; it no longer invents session ids or treats the browser cache as authoritative. Applications also follow the backend-owned one-live-session-per-application model explicitly: `Launch` / `Relaunch` / `Stop current session`, and relaunch replaces the current live session instead of creating a concurrent second launched copy in the page shell.

## Application And Execution Modes

When a live session exists, the page exposes two intentionally different surfaces:

- `Application` mode is app-first. `ApplicationShell.vue` keeps only minimal host chrome (title, description, live status, launch/relaunch/stop actions, and the mode switch) and gives the bundled app UI the main near-full-screen canvas. Package ids, session ids, runtime ids, and similar metadata are hidden behind an explicit secondary details surface instead of occupying the default above-the-fold layout.
- `Execution` mode renders `ApplicationExecutionWorkspace.vue`, a narrow host-native retained-state view for member and artifact inspection. It shows the member rail, the selected member’s retained primary artifact, and any additional retained artifacts for that member.

Execution mode intentionally does **not** rebuild the full workspace monitor/chat/composer/grid inside Applications. Instead, it offers an explicit `Open full execution monitor` handoff back to `/workspace`. That handoff goes through one typed `WorkspaceExecutionLink` contract plus the workspace-owned `workspaceNavigationService.ts` / `useWorkspaceRouteSelection.ts` boundary rather than letting Applications components mutate workspace selection stores directly.

## Session Ownership And Streaming

`applicationSessionStore` is a frontend cache/orchestration owner over backend-authoritative session state.

Key rules:

- cached active sessions are derived from backend create/bind/query responses and session-stream snapshots,
- only one live application session is tracked per application id,
- terminated sessions disconnect their session-stream transport, and
- `sendApplicationInputMessage()` forwards user input through the backend application-session boundary.

`ApplicationSessionStreamingService` subscribes to `sessionStreamUrl` so retained projections update without a full route reload.

## Iframe Bootstrap Ownership

`ApplicationSurface.vue` is the authoritative host launch owner once route binding resolves a live session.

It owns:

- the immutable `ApplicationIframeLaunchDescriptor` for the current launch instance,
- ready timeout / retry / failed state for the host launch boundary,
- acceptance of the matching child ready signal, and
- the decision to deliver bootstrap and stop the host spinner at bootstrap delivery.

`ApplicationIframeHost.vue` is now an internal bridge only. It:

- renders the iframe for a supplied descriptor,
- logs `iframe load` diagnostically,
- validates the raw ready message against the current iframe window/origin/session/launch instance, and
- posts the supplied bootstrap envelope back to the iframe.

`applicationSessionStore` and `ApplicationSession` no longer track host bootstrap state; host launch waiting / failed / delivered state is now local to `ApplicationSurface.vue`.

The host launch owner:

- resolves `entryHtmlAssetPath` against the bound backend REST base,
- derives one stable launch descriptor with `launchInstanceId`,
- appends the required v1 launch hints,
- accepts only the matching child ready event, and
- posts the versioned bootstrap payload through `ApplicationIframeHost.vue`.

The bootstrap payload now includes two transport layers:

### Host/runtime transport

- GraphQL HTTP
- REST base
- GraphQL WebSocket
- application-session snapshot streaming (`sessionStreamUrl`)

### App-scoped backend transport

- `backendStatusUrl`
- `backendQueriesBaseUrl`
- `backendCommandsBaseUrl`
- `backendGraphqlUrl`
- `backendRoutesBaseUrl`
- `backendNotificationsUrl`

Those backend URLs already embed the authoritative route `applicationId`. App UIs should treat them as the stable platform-owned boundary for app-owned backend logic instead of inventing alternate host paths.

## SDK Boundary

The iframe bootstrap contract is still the transport handoff from host to app UI, but app authors are no longer expected to live on raw postMessage payloads alone.

The public author-facing v1 surface is now:

- `@autobyteus/application-sdk-contracts` for shared manifest/backend/request/event types,
- `@autobyteus/application-frontend-sdk` for app-UI query/command/GraphQL/notification helpers,
- `@autobyteus/application-backend-sdk` for backend definition typing, and
- `application-bundle-iframe-contract-v1.md` plus `ApplicationIframeContract.ts` for the host bootstrap envelope itself.

## Package Refresh Behavior

`applicationPackagesStore` invalidates and reloads Applications, Agents, and Agent Teams together after application-package import or removal so bundle-owned apps and definitions refresh in the same session without a manual reload.

## Related Docs

- `application-bundle-iframe-contract-v1.md`
- `agent_management.md`
- `agent_teams.md`
- `settings.md`
- `../../autobyteus-server-ts/docs/modules/application_capability.md`
- `../../autobyteus-server-ts/docs/modules/applications.md`
- `../../autobyteus-server-ts/docs/modules/application_sessions.md`
- `../../autobyteus-server-ts/docs/modules/application_backend_gateway.md`
- `../../autobyteus-server-ts/docs/modules/application_engine.md`
- `../../autobyteus-server-ts/docs/modules/application_storage.md`
- `../../autobyteus-application-sdk-contracts/README.md`
- `../../autobyteus-application-frontend-sdk/README.md`
- `../../autobyteus-application-backend-sdk/README.md`
