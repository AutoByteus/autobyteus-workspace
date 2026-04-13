# Applications Module - Frontend

## Scope

Shows Applications as a first-class top-level module, prepares launch drafts from bound runtime definitions, binds `/applications/[id]` to backend-owned application sessions, hosts bundled application UIs inside the generic iframe shell, and renders a native Execution view from retained application/member projections.

## Main Files

- `pages/applications/index.vue`
- `pages/applications/[id].vue`
- `stores/applicationStore.ts`
- `stores/applicationSessionStore.ts`
- `stores/applicationPageStore.ts`
- `components/applications/ApplicationCard.vue`
- `components/applications/ApplicationLaunchConfigModal.vue`
- `components/applications/ApplicationShell.vue`
- `components/applications/ApplicationSurface.vue`
- `components/applications/ApplicationIframeHost.vue`
- `components/applications/execution/ApplicationExecutionWorkspace.vue`
- `services/applicationStreaming/ApplicationSessionStreamingService.ts`
- `utils/application/applicationLaunch.ts`
- `utils/application/applicationAssetUrl.ts`
- `utils/application/applicationSessionTransport.ts`
- `types/application/ApplicationSession.ts`
- `types/application/ApplicationIframeContract.ts`
- `docs/application-bundle-iframe-contract-v1.md`

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
7. `ApplicationSurface.vue` and `ApplicationExecutionWorkspace.vue` render from the bound session snapshot.

## Application And Execution Modes

When a live session exists, the page exposes two surfaces:

- `Application` mode renders `ApplicationSurface.vue`, which hosts the bundled iframe UI through `ApplicationIframeHost.vue`.
- `Execution` mode renders `ApplicationExecutionWorkspace.vue`, a host-native retained-state view.

The Execution view is intentionally artifact/status-first. It renders:

- `view.delivery.current` as the current top-level delivery state,
- the session member list from `view.members`,
- retained `progressByKey` entries for the selected member, and
- the selected member’s retained primary artifact from `artifactsByKey`.

It does not reimplement the full runtime workspace UI inside Applications.

## Session Ownership And Streaming

`applicationSessionStore` no longer creates session ids locally. It is a frontend cache/orchestration owner over backend-authoritative session state.

Key rules:

- cached active sessions are derived from backend create/bind/query responses and session-stream snapshots,
- only one live application session is tracked per application id,
- terminated sessions disconnect their session-stream transport,
- `sendApplicationInputMessage()` forwards user input through the backend application-session boundary, and
- iframe bootstrap state remains a frontend-only concern: `waiting_for_ready`, `bootstrapped`, or `bootstrap_failed`.

`ApplicationSessionStreamingService` subscribes to `sessionStreamUrl` so retained projections update without a full route reload.

## Iframe Bootstrap Ownership

`ApplicationIframeHost.vue` owns the host-side iframe lifecycle and failure UI.

The host:

- resolves `entryHtmlAssetPath` against the bound backend REST base,
- appends the required v1 launch hints,
- waits for the exact child ready event,
- posts the versioned bootstrap payload, and
- marks the session bootstrap state in `applicationSessionStore`.

The bootstrap payload includes transport metadata for:

- GraphQL HTTP,
- REST,
- GraphQL WebSocket, and
- application-session snapshot streaming (`sessionStreamUrl`).

`ApplicationIframeContract.ts` and `application-bundle-iframe-contract-v1.md` remain the public contract for bundled application authors.

## Package Refresh Behavior

`agentPackagesStore` invalidates and reloads Applications, Agents, and Agent Teams together after package import or removal so bundle-owned apps and definitions refresh in the same session without a manual reload.

## Related Docs

- `application-bundle-iframe-contract-v1.md`
- `agent_management.md`
- `agent_teams.md`
- `../../autobyteus-server-ts/docs/modules/applications.md`
- `../../autobyteus-server-ts/docs/modules/application_sessions.md`
