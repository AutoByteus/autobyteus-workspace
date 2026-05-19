# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Architecture review round 1 send-back rework completed; revised requirements/design package is ready for architecture re-review, no implementation handoff yet.
- Investigation Goal: Convert the mobile remote-access product discussion into a detailed ticket requirement set, including build-order judgement, VPN-agnostic network posture, pairing/auth/security requirements, mobile/PWA/Android packaging boundaries, and validation criteria.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: Crosses Electron server lifecycle, server auth, REST/GraphQL/WebSocket behavior, frontend node binding, PWA/mobile packaging, Android/iOS wrapper strategy, VPN/provider documentation, and product onboarding.
- Scope Summary: AutoByteus Remote Access requirements for phone clients connecting to desktop/server nodes over any private network.
- Primary Questions To Resolve: Should Android be built first; how much is Android-specific; what must exist before production remote access; how to avoid Tailscale lock-in; what user-facing setup should look like.

## Request Context

User asked how to proceed with mobile remote access, whether to build Android first, whether the work is mostly Android-side, and requested that we first bootstrap a ticket and write detailed requirements.

Prior discussion established:

- AutoByteus is an Electron desktop app that starts an internal server.
- The product already supports multiple nodes through a node area in server settings.
- User wants phone access while away from home.
- User initially considered Tailscale, then clarified AutoByteus should not be limited to Tailscale.
- Product should support any VPN/private network and provide at least one open/self-hosted setup guide such as Headscale/NetBird/Netmaker/WireGuard.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements`
- Current Branch: `codex/mobile-remote-access-requirements`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-16.
- Task Branch: `codex/mobile-remote-access-requirements`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): Not requested yet.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is requirements-only at this stage. Do not implement before requirements approval and design review.

## Source Log
| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-16 | Command | `pwd && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap environment discovery | Shared checkout was on `personal`; remote default is `origin/personal` | No |
| 2026-05-16 | Command | `git fetch origin --prune` | Refresh base before creating worktree | Succeeded | No |
| 2026-05-16 | Command | `git worktree add -b codex/mobile-remote-access-requirements /Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements origin/personal` | Create dedicated task worktree/branch | Succeeded | No |
| 2026-05-16 | Code | `autobyteus-server-ts/src/app.ts` | Confirm server host defaults | `parseArgs` defaults to host `0.0.0.0`, port `8000`; supports `--host` and `--port` | Runtime smoke test later |
| 2026-05-16 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Confirm server listen boundary | Server listens with provided host/port | Auth/design investigation later |
| 2026-05-16 | Code | `autobyteus-web/shared/embeddedServerConfig.ts` | Confirm embedded desktop URL | `127.0.0.1:29695` fixed embedded server base | Remote clients need different base URL |
| 2026-05-16 | Code | `autobyteus-web/electron/server/*ServerManager.ts` | Confirm Electron server launch behavior | Managers set public server host to loopback and pass `--port`, but not `--host` | Design must separate local embedded URL from remote-facing URL |
| 2026-05-16 | Code | `autobyteus-web/utils/nodeEndpoints.ts`, `autobyteus-web/stores/windowNodeContextStore.ts`, `autobyteus-web/stores/nodeStore.ts`, `autobyteus-web/plugins/20.windowNodeBootstrap.client.ts`, `autobyteus-web/nuxt.config.ts` | Confirm frontend remote-node foundations | Frontend has endpoint derivation and browser localStorage fallback; non-Electron startup still needs mobile-first pairing/runtime binding | Design required |
| 2026-05-16 | Command | `rg -n "cors|authorization|auth|token|pair|session|csrf|jwt|bearer" autobyteus-server-ts/src autobyteus-web/utils autobyteus-web/stores` | Look for auth/pairing/security clues | Found remote browser pairing concepts and gateway/session tokens; no general mobile app auth confirmed in this pass | Detailed auth design required |
| 2026-05-16 | Existing artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-client-tailscale-feasibility/tickets/mobile-client-tailscale-feasibility/requirements.md` | Reuse prior feasibility investigation context | Prior feasibility findings already documented server reachability, frontend node model, auth gap, generated URL risk | Folded into new requirements |
| 2026-05-16 | Existing artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-client-tailscale-feasibility/tickets/mobile-client-tailscale-feasibility/investigation-notes.md` | Reuse prior detailed code/external source context | Prior notes included source paths and Tailscale/Headscale/NetBird/Netmaker external findings | Folded into new requirements |
| 2026-05-16 | Web | `https://tailscale.com/kb/1507/custom-control-server` | Verify custom control/self-managed control-plane posture | Tailscale docs describe using a custom control server URL and mention Headscale as a self-managed control-plane example | Product can document Headscale without core Tailscale dependency |
| 2026-05-16 | Web | `https://headscale.net/0.25.0/` | Verify Headscale positioning | Headscale describes itself as open-source, self-hosted implementation of Tailscale control server | Closest open/self-hosted Tailscale-like recommendation |
| 2026-05-16 | Web | `https://docs.netbird.io/about-netbird/how-netbird-works`, `https://docs.netbird.io/` | Verify NetBird as self-hosted WireGuard mesh option | NetBird docs describe WireGuard peer-to-peer tunnels and self-hosting availability | Include as open/private-network guide profile |
| 2026-05-16 | Web | `https://docs.netmaker.io/` | Verify Netmaker as self-hosted WireGuard option | Netmaker docs describe open-source WireGuard virtual networking that can be self-hosted or SaaS | Include as open/private-network guide profile |
| 2026-05-16 | Code | `autobyteus-server-ts/src/api/rest/index.ts` | Inspect REST route registration and auth seam | REST routes are registered under `/rest`; health/files/media/workspaces/upload/context-files/run-file-changes/team-communication/application routes have no shared auth wrapper today | Add route policy/auth hook before route registration |
| 2026-05-16 | Code | `autobyteus-server-ts/src/api/graphql/index.ts`, `schema.ts` | Inspect GraphQL auth/context seam | Mercurius registers `/graphql` with GraphiQL and subscriptions; TypeGraphQL resolvers are not decorated with authorization | Use Fastify-level auth policy for GraphQL route; restrict GraphiQL to loopback or development |
| 2026-05-16 | Code | `autobyteus-server-ts/src/api/websocket/*.ts` | Inspect WebSocket auth seam | WebSocket handlers directly attach `/ws/agent`, `/ws/agent-team`, `/ws/terminal`, `/ws/file-explorer`, app backend notifications; no auth check before connection | Add shared websocket auth policy before handler connection; browser WebSocket needs token query/subprotocol path |
| 2026-05-16 | Code | `autobyteus-web/services/api.ts`, `plugins/30.apollo.client.ts`, `services/agentStreaming/transport/WebSocketClient.ts` | Inspect frontend API client seams | Axios REST service, Apollo client, and WebSocket client do not add app-level auth headers/tokens today | Add central mobile credential/auth transport layer |
| 2026-05-16 | Code | `autobyteus-web/components/settings/NodeManager.vue`, `pages/settings.vue` | Inspect settings placement | Existing NodeManager is the natural area for Phone Access card; settings navigation already has nodes/server areas | Add Phone Access surface near NodeManager/current node, not as scattered raw settings |
| 2026-05-16 | Code | `autobyteus-server-ts/src/persistence/file/store-utils.ts` | Inspect simple durable storage option | Existing file store utilities provide locked JSON persistence under memory persistence root | Paired-device credentials can use a small file-backed store without immediate Prisma schema churn |
| 2026-05-16 | Code | `autobyteus-web/package.json`, `nuxt.config.ts`, `autobyteus-server-ts/package.json` | Inspect PWA/static serving packaging | Nuxt can generate static output; server does not currently depend on `@fastify/static`; mobile build target does not exist | Design needs mobile-web build target plus Fastify static serving under `/mobile` |
| 2026-05-16 | Code | `autobyteus-web/build/scripts/build.ts`, `scripts/prepare-server.*` | Inspect desktop package resource flow | Electron bundles `resources/server` as extraResources; server package is prepared independently from renderer | Mobile web assets need explicit build/copy/package path into server resources |
| 2026-05-16 | Code | `autobyteus-web/utils/serverConfig.ts`, `utils/contextFiles/contextAttachmentPresentation.ts`, `utils/application/applicationAssetUrl.ts`, `autobyteus-server-ts/src/services/media-storage-service.ts` | Inspect generated URL and bound-node URL behavior | Some flows already accept bound REST base URL; others still use global runtime config or server `AUTOBYTEUS_SERVER_HOST`, which is loopback in Electron | Design must remove mobile-supported dependence on loopback/global URLs |
| 2026-05-19 | Existing artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/api-e2e-validation-report.md` | Understand Round 3 API/E2E failure and reroute classification | Validation failed on mobile functional parity: unreadable rows, incomplete new-run, file preview/attach, and Activity/team/tool journeys | Requirements/design refreshed and routed back to architecture review |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileRuns.vue`, `MobileFiles.vue`, `MobileActivity.vue`, `MobileContextSwitcher.vue`, `composables/mobile/useMobileWorkCatalog.ts` | Inspect current mobile implementation behind validation failures | Found run setup guidance placeholder, file preview placeholder/attach no-op, activity team-message no-op, and horizontal row layout/metadata that matches truncation evidence | Design now names Mobile Work Experience owners and required removals/refactors |
| 2026-05-19 | Code | `autobyteus-web/stores/agentRunStore.ts`, `agentTeamRunStore.ts`, `fileExplorer.ts`, `agentSelectionStore.ts`, `types/conversation.ts`, `utils/contextFiles/contextAttachmentModel.ts` | Identify authoritative owners to reuse/refactor for mobile parity without breaking desktop | Existing run/file/context owners can support mobile if used via a mobile adapter; `agentSelectionStore` mixes selection with desktop center-view navigation and needs isolation/refactor | Implementation must reuse/refactor shared owners and protect desktop route behavior |
| 2026-05-19 | Command | `rg -n "Start new|Full content|Attach to chat|Open team messages|Context Files|workspace|Running|Activity|terminal|unsupported|placeholder" autobyteus-web/components/mobile autobyteus-web/stores/mobileWorkStore.ts autobyteus-web/composables/mobile autobyteus-web/types/mobileWork.ts` | Locate mobile placeholders/no-op controls and row metadata sources | Confirmed mobile run/file/activity failure points and metadata composition | No; captured in refreshed design |
| 2026-05-19 | Command | `git diff --check` | Validate refreshed Markdown artifacts do not introduce whitespace errors | Passed | No |

| 2026-05-19 | Existing artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/api-e2e-validation-report.md` Round 4 sections `Failed / Needs Solution Design UX Follow-up` and `Classification` | Understand delivery-readiness failure after Code Review Round 8 | Functional parity mostly works, but remaining mobile-specific UX issues require design refinement: mixed status, risky run setup selection, dense Activity, large-folder file browsing, and context visibility near send/launch. User later clarified API-key/runtime failure after launch is desktop-equivalent and out of scope | Requirements/design refreshed and routed back to architecture review |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileHome.vue`, `stores/mobileNodeSessionStore.ts`, `utils/remoteAccess/mobileConnectionDiagnostics.ts` | Inspect misleading Offline/Cannot reach status source | Home derives Offline from missing status plus diagnostic; status fetch maps non-ok/unknown to network unreachable even when other APIs may succeed | Design now requires composite status/reachability model |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileRunSetup.vue`, `composables/mobile/useMobileRunLaunchCoordinator.ts` | Inspect run setup target/default/readiness behavior | Run Setup uses native selects and `applyContextDefaults()` auto-fills first agent/team/workspace when no context default exists | Design now requires intentional pickers and launch summary, without adding API-key/provider preflight |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileActivity.vue`, `MobileTeamMessages.vue`, `MobileToolActivityList.vue` | Inspect Activity density surfaces | Activity renders task rows plus visible team messages/tool history; rows clamp some text but page can still be long/dense with real data | Design now requires compact summaries, filters, and expansion/detail states |
| 2026-05-19 | Code | `autobyteus-web/components/mobile/MobileFiles.vue`, `stores/mobileWorkStore.ts` | Inspect file discovery/context visibility | File preview/attach works, but file list is visible-folder-first and context visibility can be split between top tray/run setup/composer indicators | Design now requires sticky breadcrumb, discovery aids/deep search, and context visibility near send/launch |
## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Electron desktop starts server through server manager and opens the desktop renderer against embedded node loopback URL.
- Current execution flow:
  1. Electron desktop starts bundled server on fixed port `29695`.
  2. Server default host is broad (`0.0.0.0`) unless overridden.
  3. Desktop renderer treats `http://127.0.0.1:29695` as embedded node.
  4. Frontend derives node endpoints from a base URL and can persist remote node registry entries in browser fallback mode.
  5. Production mobile onboarding/pairing does not yet exist as a first-class flow.
- Ownership or boundary observations:
  - Electron owns desktop lifecycle and desktop-only IPC capabilities.
  - Server owns REST/GraphQL/WebSocket execution and generated file/media URLs.
  - Frontend has node endpoint derivation but lacks a dedicated mobile remote-access bootstrap owner.
  - Existing remote browser pairing is adjacent but not equivalent to app-wide mobile device pairing/auth.
- Current behavior summary: Low-level connectivity is plausible today over private networks, but production mobile access requires a new Remote Access boundary for pairing/auth, runtime node binding, reachability diagnostics, mobile feature gating, and provider-agnostic docs.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Missing Invariant; Duplicated Policy Or Coordination risk
- Refactor posture evidence summary: PWA/mobile wrapper alone is insufficient; remote access needs coherent ownership around pairing/auth, reachability, active node binding, public URL handling, and mobile capability gates.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/app.ts` | Host default is `0.0.0.0`; server accepts host/port args | Remote reachability likely exists if network/firewall allow | Decide safe default/exposure posture |
| `autobyteus-web/shared/embeddedServerConfig.ts` | Embedded URL hardcodes `127.0.0.1:29695` | Desktop local URL cannot be the mobile node URL | Design remote-facing URL policy |
| `autobyteus-web/electron/server/*ServerManager.ts` | Electron sets `AUTOBYTEUS_SERVER_HOST` to loopback | Server-generated URLs risk loopback leakage | Design client/public URL handling |
| `autobyteus-web/utils/nodeEndpoints.ts` | Endpoints can derive from one base URL | Good reusable primitive for mobile | Use as authoritative endpoint policy |
| `autobyteus-web/stores/nodeStore.ts` | Browser fallback localStorage exists; Electron open window API is desktop-specific | Mobile can reuse storage concept but needs mobile binding UX | Add mobile bootstrap owner |
| Auth search | No general app-wide mobile auth confirmed | Production remote access cannot rely on VPN alone | Add pairing/auth design |
| Prior feasibility artifacts | Tailscale/Headscale/company VPN concept validated at product level | Requirements should be provider-agnostic | Include docs profiles |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/app.ts` | Server CLI/bootstrap | Default host broad; host/port configurable | Remote exposure must be explicit/safe |
| `autobyteus-server-ts/src/server-runtime.ts` | Fastify app construction/listen | REST/GraphQL/WebSocket entrypoints live here | Auth middleware or route protection likely belongs near server runtime boundaries |
| `autobyteus-web/shared/embeddedServerConfig.ts` | Desktop embedded server constants | Loopback fixed embedded URL | Keep desktop-local URL separate from remote-facing URL |
| `autobyteus-web/electron/server/baseServerManager.ts` and platform managers | Desktop server lifecycle | Fixed server port and loopback public host currently used | Desktop Phone Access status and remote URL candidates likely integrate here or nearby |
| `autobyteus-web/utils/nodeEndpoints.ts` | Endpoint derivation | Central base URL -> REST/GraphQL/WebSocket mapping | Reuse/strengthen as shared mobile endpoint policy |
| `autobyteus-web/stores/windowNodeContextStore.ts` | Active window node context | Can initialize/bind a node context | Candidate for mobile active-node bootstrap integration |
| `autobyteus-web/stores/nodeStore.ts` | Node registry | Browser fallback uses localStorage; Electron window opening is desktop-only | Mobile needs first-run node binding and not open-node-window behavior |
| `autobyteus-web/plugins/20.windowNodeBootstrap.client.ts` | Client-side node context bootstrap | Non-Electron default context exists | Needs pairing/runtime-configured mobile default |
| `autobyteus-web/nuxt.config.ts` | Runtime/build endpoint defaults | Env-driven defaults are not enough for generic mobile distribution | Runtime pairing must override build defaults |
| `autobyteus-web/stores/remoteBrowserSharingStore.ts` | Remote browser pairing store | Adjacent pairing/token concept exists but is Electron-browser-sharing specific | Do not confuse with app-wide mobile device pairing; may provide implementation patterns |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-16 | Static trace | `rg -n "host:|0.0.0.0|--host|--port" autobyteus-server-ts/src/app.ts autobyteus-server-ts/src/server-runtime.ts` | Server default host broad; listen uses provided options | Phone over private network can likely reach server if firewall allows |
| 2026-05-16 | Static trace | `rg -n "INTERNAL_SERVER|AUTOBYTEUS_SERVER_HOST|--port|--host|29695" autobyteus-web/shared/embeddedServerConfig.ts autobyteus-web/electron/server` | Desktop embedded/public host values are loopback; server managers pass port but no host | Remote-facing URL handling is a requirement |
| 2026-05-16 | Static trace | `rg -n "BACKEND_NODE_BASE_URL|WindowNode|localStorage|openNodeWindow" ...` | Node context and browser fallback exist, but mobile bootstrap flow does not | Mobile runtime binding is likely frontend design work |

## External / Public Source Findings

- Tailscale custom control server docs: `https://tailscale.com/kb/1507/custom-control-server`. Relevant finding: Tailscale clients can be configured to use a custom control server URL; Headscale is mentioned as a self-managed control plane example.
- Headscale docs: `https://headscale.net/0.25.0/`. Relevant finding: Headscale positions itself as an open-source, self-hosted implementation of the Tailscale control server.
- NetBird docs: `https://docs.netbird.io/about-netbird/how-netbird-works` and `https://docs.netbird.io/`. Relevant finding: NetBird uses WireGuard peer-to-peer tunnels and can be self-hosted.
- Netmaker docs: `https://docs.netmaker.io/`. Relevant finding: Netmaker is an open-source WireGuard virtual networking platform that can be self-hosted or SaaS.
- Product implication: VPN/private-network choice should be a setup profile, not a core AutoByteus protocol dependency.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Not used in this requirements bootstrap.
- Required config, feature flags, env vars, or accounts: Future smoke tests require desktop app running, phone/browser client, and at least one private network path such as LAN/Tailscale/Headscale/company VPN.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree/branch creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Building Android first as a separate native product would attack the wrong boundary. The main missing capability is remote-access product infrastructure shared by PWA, Android, and iOS.
2. PWA/mobile web-first is the lowest-risk first path because the existing Nuxt frontend and node endpoint derivation already provide part of the needed abstraction.
3. Android wrapper may still be valuable soon, but mostly for native affordances: QR scanner, secure storage, app links, distribution, permissions, share sheet, and notifications.
4. The product must add app-level pairing/auth before supporting remote access beyond smoke tests.
5. The product should remain VPN-provider agnostic and document Tailscale, Headscale, company VPN, NetBird, Netmaker/WireGuard as setup profiles.
6. Desktop loopback embedded URL and server-generated URL behavior are likely blockers for mobile if not made remote-aware.

## Constraints / Dependencies / Compatibility Facts

- Current server port is fixed at `29695` for Electron embedded server.
- Desktop app must be running and reachable for phone-as-client mode.
- Private network routing/firewall/DNS are outside AutoByteus direct control but can be diagnosed and documented.
- Browser/PWA credential storage is less secure than native secure storage.
- Native Android may require explicit cleartext HTTP policy for private network URLs unless HTTPS/Tailscale Serve/custom cert approach is selected.
- iOS PWA/native behavior may require specific local-network/private-network permissions and HTTPS considerations.

## Open Unknowns / Risks

- Exact first supported mobile functional slice still needs product approval.
- Whether to serve the PWA from the desktop server or host it separately has HTTPS/mixed-content implications.
- Existing GraphQL/WebSocket route auth integration points need deeper design.
- Generated file/media/artifact URL flows need audit.
- Device credential storage design depends on whether first release is PWA-only or includes native wrapper.
- Exact VPN docs maintenance burden depends on which self-hosted profiles are officially documented.


## Deeper Design Investigation Findings

### Server Auth / Route Boundary

- `buildApp` currently registers CORS, multipart, websocket, REST, WebSocket routes, and GraphQL without a shared access policy owner.
- REST routes are grouped under `/rest` but each route file directly registers handlers; adding auth individually would duplicate policy. A Fastify-level route policy/auth hook is the right owner.
- GraphQL currently registers through Mercurius with `graphiql: true` and subscriptions enabled. There is no TypeGraphQL authorization decoration. Route-level auth is a simpler first boundary than resolver-by-resolver auth.
- WebSocket routes are direct `app.get(..., { websocket: true })` handlers. Browser WebSocket clients cannot set arbitrary headers, so mobile auth should use a deliberate WebSocket token transport such as a query token or subprotocol, with server logging redaction.
- Desktop embedded renderer needs a coherent local trust policy. It should not receive or manage the same mobile device credential just to keep existing loopback desktop flows working. A loopback-local exemption for desktop-owned access is a named policy, not a legacy fallback.

### Pairing / Device Persistence

- Existing `persistence/file/store-utils.ts` provides locked JSON persistence under the app data/memory persistence root. For the expected small number of paired phones, a file-backed paired-device store is sufficient and avoids a Prisma migration in the first implementation.
- One-time pairing sessions should be memory-only with expiry; if the desktop/server restarts, the QR expires and the user can generate a new one.
- Long-lived device credentials must be stored hashed only, with clear device metadata and revocation state.

### Frontend Runtime / Auth Transport

- `windowNodeContextStore` and `nodeEndpoints.ts` are strong reuse points. Mobile should bind a paired node into this context rather than inventing parallel endpoint state.
- Current Apollo, Axios, fetch, and WebSocket call paths do not share an auth-token owner. Adding token handling separately in each store would duplicate policy and risk gaps.
- Some flows still use `getServerUrls()` or Nuxt runtime config. Mobile-supported flows must use bound node endpoints from `windowNodeContextStore` plus a central authorized transport layer.

### PWA / Mobile Static Serving

- The server currently does not serve the Nuxt app as static assets. Electron renderer assets are packaged separately, and the server package is copied to `resources/server`.
- Serving a mobile web/PWA under the server origin, for example `/mobile`, is the simplest first architecture because phone UI and API share origin: `http://desktop-tailnet:29695/mobile` -> `/graphql`, `/rest`, `/ws/*`.
- Implementing this requires a mobile-web Nuxt build target and explicit copy/package flow into the server bundle; it is not purely an Android task.

### Settings / Product Surface

- Existing Settings > Nodes area is the best user-facing location for Phone Access because it already expresses multi-node concepts and current-node identity.
- Phone Access must be more than a raw setting: it should own reachability candidates, QR/session creation, paired-device list, revoke controls, and troubleshooting.

### Spine Coverage Implication

The design must include at least these spines: desktop QR generation, phone pairing, authenticated mobile API call, WebSocket stream auth, revocation, mobile static app serving, generated URL resolution, and Tailscale validation. Without these spines, implementation would likely over-focus on the PWA shell and miss security/reachability invariants.

## Notes For Architect Reviewer

Architecture review round 1 returned design-impact findings. The revised package now addresses route policy/local trust, ClientFacingUrlResolver mapping, Phone Access disable/revoke-all, WebSocket query-token auth, and explicit use-case-to-spine coverage. Next step is architecture re-review before implementation.


## Architecture Review Round 1 Send-Back Rework

### Review Source

- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/design-review-report.md`
- Decision: Fail / not ready in round 1.
- Blocking findings addressed in revised requirements/design:
  - AR-MRA-001: concrete route policy/local trust semantics.
  - AR-MRA-002: concrete `ClientFacingUrlResolver` file/interface/integration mapping.
  - AR-MRA-003: requirement/design gap for disable Phone Access and revoke-all paired phones.
  - AR-MRA-004: selected WebSocket auth token transport and redaction policy.

### Additional Code Evidence Consulted During Rework

- `autobyteus-server-ts/src/api/rest/index.ts`: confirmed REST route families registered under `/rest`, including health, files, media, upload, workspaces, context files, channel ingress, run file changes, team communication, application bundles, and application backends.
- `autobyteus-server-ts/src/api/graphql/index.ts`: confirmed Mercurius `/graphql` with `graphiql: true` and subscriptions enabled.
- `autobyteus-server-ts/src/api/websocket/index.ts`: confirmed direct WebSocket route registration for file explorer, terminal, agent, and application backend notifications.
- `autobyteus-server-ts/src/logging/http-access-log-policy.ts`: confirmed access log payload currently logs `request.url`; query-token WebSocket/HTTP logging requires a shared sensitive URL redaction helper.
- `autobyteus-server-ts/src/api/rest/upload-file.ts`: confirmed upload response currently builds absolute file URLs from `appConfigProvider.config.getBaseUrl()`.
- `autobyteus-server-ts/src/services/media-storage-service.ts`: confirmed `listMediaFiles`, `ingestLocalFileForContext`, and `storeMediaAndGetUrl` build absolute URLs from `config.getBaseUrl()`.

### Rework Decisions Recorded In Design Spec

1. Added a **Spine Coverage Rule**: every in-scope use case must map to explicit DS/RS/BLS spines when it crosses desktop/server, phone/server, auth, persistence, local/remote, generated URL, or mobile capability boundaries.
2. Added **Use-Case-To-Spine Coverage Matrix** for UC-MRA-001 through UC-MRA-012 and expanded the data-flow inventory from core happy paths to fourteen primary spines plus five return/event spines and four bounded local spines.
3. Made local trust exact: only peer socket loopback (`127.0.0.0/8`, `::1`, IPv4-mapped loopback) is local; `Host`, `Origin`, `Forwarded`, `X-Forwarded-For`, and `X-Real-IP` are ignored.
4. Added explicit route classification table for `/mobile`, `/rest/health`, remote-access status/candidates/pairing/devices/settings, GraphQL/GraphiQL/subscriptions, `/ws/*`, external channel ingress callbacks, application routes, file/media/workspace/context routes, and future defaults.
5. Chose MVP WebSocket auth policy `WEBSOCKET_AUTH_QUERY_TOKEN` with query key `access_token`, mandatory redaction, server/client helper contracts, and close-code mapping.
6. Added concrete `ClientFacingUrlResolver` path/interface/base-url policy and MVP producer migration list for upload/media/context/application asset URL risks.
7. Refined requirements from `Design-ready` to `Refined` to preserve R-MRA-074 and add explicit R-MRA-076/R-MRA-077 plus acceptance criteria AC-MRA-018/019 for disabled Phone Access and revoke-all.
8. Added settings/revoke-all design: `RemoteAccessSettingsService`, `remote-access-settings-store.ts`, `GET/PUT /rest/remote-access/settings`, and `DELETE /rest/remote-access/devices` revoke-all command.

### Residual Notes For Review

- Direct application iframe/asset rendering on mobile remains out of MVP unless an authorized fetch/blob or signed asset URL design is added; application route families are still classified protected.
- Proxy-aware local trust remains out of scope; future reverse-proxy support must add explicit trusted-proxy configuration rather than trusting forwarded headers.
- Tailscale remains the first validation profile only; Headscale/company VPN/NetBird/Netmaker/WireGuard are provider-agnostic setup profiles feeding the same URL/pairing spines.


## Mobile PWA User Validation Finding

After implementation and Electron packaging, the user tested the PWA on a phone over LAN. Pairing and `/mobile` access worked, but the post-pairing workspace layout was judged not usable on mobile. Screenshots showed the desktop left drawer, workspace/team tree, top tabs (`Running`, `Files`, `Team`, `Tools`), nested running/config tabs, and right-panel-derived tools/activity concepts competing in a narrow phone viewport.

Design implication: this is a same-ticket UX rework because the Remote Access MVP is not product-usable if the phone experience remains a compressed desktop layout. The rework is expected to be mostly frontend and should preserve desktop behavior.

Artifacts added:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/mobile-ux-redesign-addendum.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/ui-prototypes/mobile-pwa-navigation/experience-story.md`

## Round 3 Mobile Functional Parity Validation Return (2026-05-19)

API/E2E returned the Mobile UX Redesign Local Fix as `Fail — Design Impact / Requirement Gap` after testing the current `/mobile` implementation against a 390x844 viewport and real local backend GraphQL data. Authoritative report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/api-e2e-validation-report.md`.

User clarification carried into requirements/design: mobile Remote Access is not merely a phone-shaped UI. It should let the user accomplish the practical desktop-web work journeys from a phone, while the normal desktop/web journey must not be broken or restyled by mobile work.

Validation findings that change requirements/design scope:

1. `MRA-E2E-025`: Real-data work rows are unreadable on phone. Home recent work, Runs, and Context Switcher rows collapse titles because long status/workspace metadata pills compete with the primary title. Evidence files include `round3-mobile-runs-truncation-real-data.png`, `round3-mobile-context-switcher-truncation-real-data.png`, and `round3-mobile-home-real-data.png`.
2. `MRA-E2E-026`: Mobile cannot complete a new agent/team run journey. `MobileRuns.vue` exposes `Start new`, but the current state is a guidance card and context chooser rather than a launchable setup form.
3. `MRA-E2E-027`: Files journey is incomplete. `MobileFiles.vue` lists files but preview is placeholder copy, and `Attach to chat` only closes the preview without adding visible composer context.
4. `MRA-E2E-028`: Activity/team/tool journey is incomplete and ambiguous. `MobileActivity.vue` shows cards, but `Open team messages` has no visible state change and terminal/tools are only globally unsupported.
5. `MRA-E2E-030`: Cross-cutting gap: current addendum fixed squeezed desktop navigation but did not define enough functional parity for desktop-web-equivalent mobile journeys.

Current code evidence consulted during solution-design refresh:

- `autobyteus-web/components/mobile/MobileRuns.vue`: `showRunSetup` toggles a guidance card; no mobile run setup form, initial prompt, required config readiness, or launch call is present.
- `autobyteus-web/components/mobile/MobileFiles.vue`: file preview contains placeholder text and `attachFile()` only clears `previewNode`; it does not create a `ContextAttachment` or update composer state.
- `autobyteus-web/components/mobile/MobileActivity.vue`: team messages button is enabled for team context but has no click handler/state transition; task plan is a short card only; terminal/tools are unsupported.
- `autobyteus-web/components/mobile/MobileContextSwitcher.vue` and `MobileRuns.vue`: rows use horizontal flex with a shrink-0 metadata pill, matching the observed real-data title truncation failure.
- `autobyteus-web/composables/mobile/useMobileWorkCatalog.ts`: metadata combines status and workspace names into a single pill such as `Running · autobyteus-workspace-superrepo`, contributing to row pressure.
- `autobyteus-web/stores/agentRunStore.ts` and `autobyteus-web/stores/agentTeamRunStore.ts`: existing authoritative run launch owners already create/restore runs and send first/subsequent messages over GraphQL/WebSocket; mobile should reuse these through an adapter or refactored shared owner, not fork a mobile protocol.
- `autobyteus-web/stores/fileExplorer.ts` already has authorized file-content/media fetch behavior through bound node endpoints; mobile file preview should reuse this owner or extract a shared mobile-safe preview adapter rather than keeping a placeholder.
- `autobyteus-web/types/conversation.ts` and `utils/contextFiles/contextAttachmentModel.ts` already define `ContextAttachment` and `createWorkspaceContextAttachment`; mobile attach should use this model and show composer context.
- `autobyteus-web/stores/agentSelectionStore.ts` currently changes selection and calls `workspaceCenterViewStore.showChat()`, which is a desktop-shell side effect. Mobile expansion exposes this as a boundary smell. Design should separate shared run selection/domain state from desktop center-view navigation or provide explicit desktop/mobile shell adapters so mobile actions do not depend on desktop workspace navigation side effects.

Design implications:

- Add a mobile functional parity matrix covering continue existing runs, send message, start new agent/team run, choose workspace/context, browse/preview/attach files, task plan/team messages/tool activity, terminal/tool/browser support boundaries, troubleshooting/unpair, and desktop/web no-regression.
- Treat unreadable rows as a local CSS/layout fix inside the broader rework: mobile list rows must prioritize title/identity vertically and constrain metadata.
- Treat run setup, file preview/attach, and activity/team messages as requirement/design gaps, not only implementation bugs, because prior addendum/handoff allowed placeholders or deferrals that no longer match the clarified product expectation.
- Add desktop/web non-regression as an explicit design contract: `/workspace` and normal desktop web flows keep the desktop shell; mobile route gates and refactors must not leak into desktop.
- Refactor legacy compressed-mobile behavior instead of preserving dual paths or compatibility wrappers. Desktop shell components can be reused only for content/domain rendering when they are mobile-safe; desktop navigation/panel owners must not become mobile owners.

## Round 4 Mobile UX Refinement Validation Return (2026-05-19)

API/E2E returned Round 4 as `Fail for delivery readiness — Design Impact / UX refinement required` after Code Review Round 8. Authoritative report: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/api-e2e-validation-report.md`.

Important positive findings now preserved:

- Round 3's functional blockers are mostly resolved: readable mobile rows, existing run continuation, real new agent/team launch paths, real file preview, active/draft file attachment targeting, Activity team messages/tool history, workspace context isolation, `/mobile/workspace` unsupported redirect, and desktop `/workspace` no-regression all passed or mostly passed.
- New agent/team launch reached backend run creation; subsequent `ANTHROPIC_API_KEY` failure was observed after launch. User clarified this is normal desktop-equivalent runtime behavior when API keys are not configured, not a mobile UX issue to solve in this ticket.

Remaining UX/design findings to carry forward:

1. `UX-MRA-040`: Mobile Home says `Offline` / `Cannot reach desktop` when `/rest/remote-access/status` is unavailable, even though other APIs succeed. Design needs composite reachability/status semantics.
2. `UX-MRA-041`: Mobile Run Setup uses large native selects and auto-selects the first agent/team/workspace when no explicit context default exists. This risks wrong-target launch.
3. `UX-MRA-042` scope correction: Runtime/provider readiness such as missing `ANTHROPIC_API_KEY` discovered after run creation is out of scope when it matches desktop behavior. Mobile should only ensure the post-launch error is visible and not misclassified as a mobile route failure.
4. `UX-MRA-043`: Activity/team messages/tool activity are functional but too dense for phone scanning. Design needs compact summaries, filters, and expansion/detail states.
5. `UX-MRA-044`: File browsing works but large folders need mobile discovery aids: recent files, attached/current-run files, type filters, sticky breadcrumb, and deliberate deep search.
6. `UX-MRA-045`: Context attachment state is correct but should stay adjacent to send/launch decisions and avoid duplicate/conflicting indicators.

Current code evidence consulted during refinement:

- `MobileHome.vue`, `mobileNodeSessionStore.ts`, and `mobileConnectionDiagnostics.ts`: Home status derives from status endpoint success/failure; unknown/non-ok status currently maps toward network unreachable copy.
- `MobileRunSetup.vue`: native select controls and `applyContextDefaults()` auto-fill first agent, team, and workspace when explicit context defaults are absent.
- `useMobileRunLaunchCoordinator.ts`: mobile launch delegates to existing run stores; do not add provider/API-key preflight in this ticket because that would change desktop-equivalent launch semantics.
- `MobileActivity.vue`, `MobileTeamMessages.vue`, `MobileToolActivityList.vue`: Activity functions but can render too much detail inline for mobile.
- `MobileFiles.vue` and `mobileWorkStore.ts`: file preview/attach works; discovery remains visible-folder oriented and context indicators need stronger adjacency to send/launch controls.

Design implication: this is a narrower UX refinement pass than Round 3. The mobile work journeys now exist; the target design should reduce misleading status, wrong-action launch risk, high-density scanning burden, large-folder navigation friction, and send/launch context confusion without reopening backend pairing/auth, adding API-key/provider preflight, or breaking normal desktop/web.

### User Clarification: API-Key / Runtime Errors Are Out Of Scope

After the Round 4 design refresh, the user clarified that the observed `ANTHROPIC_API_KEY` error after launch is normal desktop-equivalent behavior. If a user has not configured an API key/provider, the launched agent reports the error after launch in the desktop app too. This ticket should not add new mobile-only pre-launch API-key/provider checks or change when those runtime errors are discovered.

Scope correction: mobile UX should make the post-launch error visible/readable on phone, but it should not block launch or treat missing API keys as a delivery blocker for Remote Access mobile UX. Remaining Round 4 design work is limited to mobile-specific journey issues: status wording, intentional target selection, Activity density, large-folder file discovery, and context visibility near send/launch.

## Round 10 Latest-Base Command Identity Refresh (2026-05-19)

API/E2E Round 10 initially reported a real Codex/GPT-5.5 single-agent send failure from a mobile worktree that was behind `origin/personal`. The user asked whether the issue was mobile-only and clarified that general/shared issues should not be fixed inside this mobile UX ticket.

Historical evidence from the stale worktree showed that a direct WebSocket command without command identity was rejected, while the same mobile-created Codex/GPT-5.5 run responded when command identity was present. That proved the symptom was not a mobile-shell or backend runtime/provider problem.

Solution design then fetched and inspected latest `origin/personal` commit `98cfdc24612a8cce8525e934cfd373589ad51ec4` (`98cfdc24`) before authorizing any implementation. Static and executable checks on latest base showed the shared fix already exists:

- `autobyteus-web/services/agentStreaming/AgentStreamingService.ts#sendMessage` accepts command identity and serializes it for single-agent `SEND_MESSAGE`.
- `autobyteus-web/stores/agentRunStore.ts` creates stable client message identity and dedupe keys before sending.
- `AgentStreamingService` handles command ACK rejection and routes rejected commands to shared error handling.
- Focused latest-base tests passed:

```bash
pnpm -C autobyteus-web exec vitest run stores/__tests__/agentRunStore.spec.ts services/runSubmission/__tests__/localUserSubmission.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts
```

Result: pass — 3 files / 28 tests.

Current decision:

- No separate command-identity ticket remains. The obsolete ticket folder and dependency artifact were removed.
- Do not add a mobile-only WebSocket sender, hidden mobile-only dedupe scheme, or ACK workaround.
- Do not patch shared single-agent streaming inside the mobile UX ticket.
- Completed branch refresh: merge commit `26a17e0a` integrated latest `origin/personal` `98cfdc24`; implementation/API-E2E should continue from this integrated branch state.
- If the missing-identity symptom reappears after the branch includes `98cfdc24` or newer, treat it as a shared-base regression from the latest branch state, not a mobile UX local fix.

## Round 10 Non-WebSocket Mobile UX Findings Triage (2026-05-19)

API/E2E routed non-WebSocket mobile UX findings separately from the stale shared command-identity finding in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-remote-access-requirements/tickets/mobile-remote-access-requirements/mobile-ux-validation-findings-round10.md`

Summary from validation: the mobile journey is functionally close for the phone-first MVP. Home, Continue latest run, Switch work, Chat/Runs/Files/Activity, file preview/attach, Activity filters/history, `/mobile/workspace` redirect, and desktop `/workspace` no-regression all validated. The remaining non-WebSocket items are UX/design polish or product-scope decisions rather than immediate implementation blockers.

Solution-design triage:

1. Runtime/model visibility: refine the existing launch-summary requirement rather than requiring full advanced configuration on phone. Mobile MVP may use desktop/agent defaults; the UI should show the resolved runtime/model when available or clear copy such as `Uses the agent's desktop default runtime/model`.
2. Activity density: already covered by R-MRA-136 / AC-MRA-040; keep compact summaries, filters/chips, and drill-in details as target polish.
3. Large-folder file browsing: already covered by R-MRA-137 / AC-MRA-041; keep sticky breadcrumb, recent/attached/type filters, and explicit deep search as target polish.
4. Attachment/context visibility: already covered by R-MRA-138 / AC-MRA-042; keep context count/actions adjacent to send/launch and avoid conflicting duplicate indicators.
5. New-run target selection: already covered by R-MRA-132/R-MRA-133 / AC-MRA-038; keep Recent/Favorites/Current context emphasis and avoid arbitrary defaults.

Design impact: no new same-ticket backend/API scope and no desktop-web behavior change. If the product later requires strict desktop-equivalent runtime/model editing from phone, that should be explicitly re-scoped as advanced mobile run configuration rather than inferred from this MVP polish pass.
