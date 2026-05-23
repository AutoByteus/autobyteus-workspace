# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated git worktree and draft artifacts created.
- Current Status: Architecture review round 1 returned design-impact findings; source investigation and design package have been revised for architecture review round 2.
- Investigation Goal: Determine current Android pairing/control data flow, current security properties, how extra Docker-backed nodes are exposed, whether Android can pair to such nodes today, and what design changes are needed for maximum-security mobile-to-node control.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: Cross-cuts Android, web/mobile shell, Electron node windows, backend authentication/authorization, GraphQL/REST/WebSocket routes, Docker node launcher, browser bridge, docs, and security validation.
- Scope Summary: Analyze current source and propose security hardening for Android pairing and node-scoped remote control.
- Primary Questions To Resolve:
  - How does Android pair with desktop/server today?
  - What secrets/tokens/links are used, where are they stored, and how long do they live?
  - Can Android pair with a Docker-backed extra node today, and if not what architecture gap prevents it?
  - What can a paired Android client do against host desktop and extra nodes?
  - What security invariants are missing for leak-resistant, node-scoped, revocable control?

## Request Context

User asked to inspect the source for Android pairing with desktop AutoByteUs and extra Docker-backed nodes. The user is concerned that stealing a pairing link could allow whole-computer control and private-data exfiltration through agents. They want an assessment of current security and possible hardening approaches, especially pairing Android to an isolated Docker node so work runs in a controlled environment.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening`.
- Current Branch: `codex/android-pairing-security-hardening`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch --prune origin` completed before worktree creation; later refreshed again and fast-forwarded task branch to `origin/personal` at `5875b06d87d3c92b80c0dfa3675eea844324cb7c`.
- Task Branch: `codex/android-pairing-security-hardening`, tracking `origin/personal`.
- Expected Base Branch (if known): `personal` / `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Worktree was created from `origin/personal` at commit `f5bb05dfbdea9d29f73e2403c9568d26301feaa2`, then fast-forwarded to current `origin/personal` commit `5875b06d87d3c92b80c0dfa3675eea844324cb7c` after source/design artifact drafting.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-23 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repository context | Root was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; shared branch was `personal`; origin default points to `origin/personal`. | No |
| 2026-05-23 | Command | `git fetch --prune origin && git worktree list --porcelain` | Refresh base and inspect existing worktrees | Fetch succeeded; no existing worktree for this exact task. | No |
| 2026-05-23 | Command | `git worktree add -b codex/android-pairing-security-hardening /Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening origin/personal` | Create dedicated task worktree/branch | Worktree created from `origin/personal`, branch tracks `origin/personal`. | No |
| 2026-05-23 | Command | `git fetch --prune origin && git merge --ff-only origin/personal && git status --short --branch` | Refresh task branch after origin advanced during investigation | Fast-forwarded branch from `f5bb05df` to `5875b06d`; artifact folder remains untracked. | No |
| 2026-05-23 | Command | `find . -maxdepth 2 ...` and repository shape survey | Locate relevant subprojects | Relevant roots include `autobyteus-android`, `autobyteus-web`, `autobyteus-server-ts`, `autobyteus-message-gateway`, `docker`, `scripts/public/docker`, and docs. | No |
| 2026-05-23 | Doc | `autobyteus-android/README.md` | Determine Android ownership model | Android is a WebView shell for existing `/mobile`; desktop Phone Access owns pairing sessions/credentials; `/mobile` web shell owns credential storage in WebView `localStorage`; recommended production URL is private HTTPS/Tailscale Serve. | No |
| 2026-05-23 | Doc | `docs/android_mobile_access.md` | Confirm documented mobile access boundaries | Android owns first-run scan/paste/manual URL, saved node profile, reachability checks, and WebView containment; backend owns Remote Access; Tailscale is reachability not authorization. | No |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/PairingLinkParser.kt` | Inspect Android pairing parsing | Accepts URL/base64url/JSON payload with `serverBaseUrl`, `pairingCode`, optional `serverName`; loads `/mobile?pairing=...`; does not store server credential natively. | No |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/NodeUrlNormalizer.kt` | Inspect accepted URL schemes/paths | Allows `http` and `https`; recognizes `/`, `/mobile`, `/rest`, `/graphql`. | Security design should tighten production cleartext handling. |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/connection/SavedNodeStore.kt`, `SavedNodeProfile.kt` | Inspect native storage | Stores node profile only in SharedPreferences `saved_nodes`; not the Phone Access credential. | Native secure credential storage is needed if Android wrapper is to improve beyond MVP. |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/AutoByteusWebView.kt` | Inspect WebView containment | JS and DOM storage enabled; file access disabled; content access allowed; safe browsing enabled where supported; mixed content denied; multiple windows disabled. | Credential remains exposed to web storage model. |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/java/org/autobyteus/mobile/web/TrustedNavigationPolicy.kt` | Inspect navigation confinement | Same-origin `/mobile`, `/rest`, `/graphql`, Nuxt/static paths are allowed; other origins open externally or block. | Origin confinement is useful but not sufficient for stolen session secrets. |
| 2026-05-23 | Code | `autobyteus-android/app/src/main/AndroidManifest.xml`, `network_security_config.xml` | Inspect app security defaults | `allowBackup=false`; `usesCleartextTraffic=true`; base network security config permits cleartext traffic globally. | Release production policy should default to HTTPS for credential-bearing sessions. |
| 2026-05-23 | Doc | `autobyteus-server-ts/docs/features/remote_access.md` | Understand backend Remote Access design | Documents public `/mobile`, local-only settings/pairing-management endpoints, in-memory single-use pairing codes, credential stored only on phone, SHA-256 hash on server. | No |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/domain/models.ts` | Inspect remote access data model | `RemoteAccessAuthContext` has only mode/device/client base; no scope, node binding, expiry, session ID, workspace policy. `WEBSOCKET_ACCESS_TOKEN_QUERY_KEY` is `access_token`. | Data model must be tightened. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Inspect pairing lifecycle | Pairing TTL is 5 minutes; code is `randomBytes(18).toString("base64url")`; HTTPS required when creating session; code is consumed/deleted on exchange. | Existing single-use/TTL foundation should be retained and extended. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Inspect credential issuance/revocation | Credential is `mra_` + 32 random bytes base64url; server stores SHA-256 hash and compares with `timingSafeEqual`; credential has no expiry/scopes. | Replace with expiring session/token model. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Inspect credential authorization | Loopback peer is trusted. Non-loopback only checks bearer credential exists, not revoked, and Phone Access enabled; returns context without scopes. | Central authorization must enforce capabilities. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts`, `remote-access-settings-store.ts` | Inspect persistence | Device records/settings persisted in app-data JSON. Server stores hashes, not raw credentials. Settings disable Phone Access by default. | Persistence must evolve to session/scopes/audit records. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | Inspect route classification | `/mobile`, status, pairing exchange are public; settings/pairing/devices are `LOCAL_ONLY`; `POST /graphql`, `/ws/*`, and protected REST families are `LOCAL_OR_MOBILE`. | Route-level auth is too coarse for mobile control. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` | Inspect HTTP enforcement point | Fastify `onRequest` attaches remote auth context for HTTP requests; WebSockets are deferred to WS handlers. | Keep as thin facade; add operation-specific owner behind it. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | Inspect WS auth | Non-loopback WS reads `access_token` query and calls `authorizeMobileCredential`; rejected URLs are redacted in logs. | Use one-time/short-lived WS tokens and per-route scopes. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts`, `logging/http-access-log-policy.ts` | Inspect logging redaction | Sensitive query keys including `access_token`, `token`, `auth`, `authorization`, `code`, `pairing` are redacted. | Extend redaction list for new token names/admin claim tokens. |
| 2026-05-23 | Code | `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts` | Inspect mobile credential storage | Stores raw `MobileNodeSession` including raw credential in `localStorage` under `autobyteus.remote_access.mobile_session.v1`. | Biggest client-side credential-custody gap. |
| 2026-05-23 | Code | `autobyteus-web/stores/mobileNodeSessionStore.ts` | Inspect pairing exchange/client session | Parses `pairing`, POSTs `/rest/remote-access/pairing-exchanges`, stores returned raw credential, binds node as `mobile-paired-node`. Manual URL cannot finish pairing without QR/payload. | Session must become node/scopes aware and use native broker on Android. |
| 2026-05-23 | Code | `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Inspect HTTP auth | Adds `Authorization: Bearer <credential>` for active mobile session to Axios/fetch. | Must switch to access-token broker/refresh semantics. |
| 2026-05-23 | Code | `autobyteus-web/utils/remoteAccess/websocketAuth.ts` | Inspect WebSocket auth | Appends raw credential as `access_token` query parameter. | Durable secret should not ride in long-lived URL query. |
| 2026-05-23 | Code | `autobyteus-web/plugins/30.apollo.client.ts`, `services/api.ts` | Inspect GraphQL/REST client auth | Apollo/axios send the same bearer to all operations when mobile session active. | Client cannot be trusted to limit operations; backend operation auth required. |
| 2026-05-23 | Code | `autobyteus-web/components/settings/PhoneAccessCard.vue`, `stores/phoneAccessStore.ts` | Inspect owner UI path | Embedded/server window can enable Phone Access, create QR, list/revoke devices. | Needs node/scopes/session/audit UI and remote-node support. |
| 2026-05-23 | Code | `autobyteus-web/components/settings/NodeManager.vue` | Inspect remote node phone setup | `PhoneAccessCard` rendered only if `windowNodeContextStore.isEmbeddedWindow`; remote node window shows unavailable note. | Android cannot manage/pair a Docker remote node through current UI path. |
| 2026-05-23 | Code | `autobyteus-web/stores/nodeStore.ts`, `types/node.ts` | Inspect extra node model | Node registry has `embedded` and `remote`; adding remote node opens a node-bound Electron window. | Node identity can be reused/extended for mobile node bindings. |
| 2026-05-23 | Code | `autobyteus-web/electron/main.ts`, `windowNodeContextStore` | Inspect node-bound windows | Electron associates window context with `nodeId`; renderer resolves endpoints based on window node context. | Useful for owner UI selecting target node, but does not solve remote-node admin authorization. |
| 2026-05-23 | Command | Python script listing `@Mutation` decorators under `autobyteus-server-ts/src/api/graphql/types` | Assess GraphQL authority surface behind mobile bearer | Found many high-risk mutations: server settings, LLM API keys/providers, skills, packages, MCP servers, managed messaging gateway, external-channel setup, app-data migrations, workspace creation, file writes/deletes, run creation, tool approval, remote browser bridge. | Add operation-level GraphQL authorization. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/graphql/index.ts`, `schema.ts` | Inspect GraphQL stack | `type-graphql` builds schema; `mercurius` serves `/graphql`; no auth checker/context authorization is currently configured. | Introduce schema auth checker and Mercurius context or hook. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | Inspect workspace creation | `createWorkspace` accepts arbitrary `rootPath` string. | Default mobile must not create arbitrary workspaces. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/graphql/types/file-explorer.ts` | Inspect file operations | Read/write/delete/move/rename/create operate by workspace ID and path. | Must enforce file scopes and allowed workspace policy. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/websocket/terminal.ts` | Inspect terminal WebSocket | Mobile credential can pass WS auth; handler connects terminal to workspace base path. | Revised after user clarification: terminal should be denied for standard mobile at backend and UI layers. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/services/terminal-streaming/*`, `autobyteus-ts/src/tools/terminal/*` | Inspect terminal runtime | Default Unix path spawns interactive bash; Windows uses WSL/tmux; direct shell exists for Android platform. | Confirms host-vs-container terminal risk depends on node process boundary. |
| 2026-05-23 | Doc | `README.md`, `autobyteus-server-ts/docker/README.md` | Understand Docker node setup | Public launcher starts published server image; multiple indexed containers; user adds backend URL as remote node. Volumes include private data/root and host-backed workspace/shared folders. | Docker node is safer but not maximum secure by default. |
| 2026-05-23 | Code | `scripts/public/docker/autobyteus-docker.sh`, `.ps1` | Inspect launcher runtime shape | `docker run` adds `SYS_ADMIN`, `seccomp=unconfined`, publishes backend/VNC/noVNC/debug ports without loopback prefix, sets bind host `0.0.0.0`, mounts host-backed workspace/shared folders, persists `/root`, runs server container as root. | Need hardened mobile-safe profile. |
| 2026-05-23 | Code | `docker/Dockerfile.remote-server`, `autobyteus-server-ts/docker/Dockerfile.monorepo`, entrypoints | Inspect container defaults | Server binds `0.0.0.0`; image runs with root home persisted; local model hosts point to `host.docker.internal`. | Constrain exposure and document host-service access. |
| 2026-05-23 | Code | `autobyteus-web/stores/remoteBrowserSharingStore.ts`, Electron browser bridge files, server `remote-browser-bridge.ts` | Inspect remote browser sharing | Separate pairing descriptor/token flow; Electron bridge can bind `0.0.0.0` when sharing enabled; remote node registers descriptor via GraphQL. | Mobile default must not manage browser bridge registrations; separate high-risk scope. |
| 2026-05-23 | Command | `rg -n "pair|remote-access|mobile|credential|token|access_token|device" autobyteus-message-gateway/src` | Check if message gateway owns Android pairing | Gateway has its own external-channel admin/webhook tokens, but no Android Remote Access pairing path found. | No direct pairing role; GraphQL mobile could still mutate gateway config today. |
| 2026-05-23 | Web | `https://mas.owasp.org/checklists/MASVS-STORAGE/` | Check mobile storage security expectations | OWASP MASVS storage checklist emphasizes secure storage of sensitive data and avoiding sensitive information in logs/backups. | Supports native protected storage and redaction requirements. |
| 2026-05-23 | Web | `https://datatracker.ietf.org/doc/html/rfc8628` | Compare pairing/device-flow concepts | OAuth Device Authorization Grant is a reference model for short-lived device codes, user interaction/approval, polling/expiry, and not relying on device-code possession alone. | Use as design inspiration, not as a required protocol dependency. |
| 2026-05-23 | User Clarification | User clarified: terminal on phone to control computer is not a good idea; typing terminal commands on mobile has little value; viewing files might be okay. | Refine product/security requirements | Standard mobile product should remove/disable terminal and keep file access read-oriented/limited. | Update requirements/design and resend architecture handoff. |
| 2026-05-23 | User Clarification | User clarified terminal should simply be removed from mobile UI so users do not see it at all; shared Docker mounts may be over-complicated and should likely be removed from the default, with companies/users adding mounts explicitly when containers are created. | Refine Docker/mobile default requirements | Mobile terminal must be UI-removed, not merely hidden behind settings. Mobile-safe Docker should not create automatic shared mounts; mounts become explicit creation-time choices. | Update requirements/design and resend architecture handoff. |
| 2026-05-23 | Other | `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/design-review-report.md` | Process architecture review round 1 | Direction passed in principle, but implementation blocked on `AR-P1-001` node-admin claim lifecycle, `AR-P1-002` Android-facing Docker advertised-origin verification, and `AR-P1-003` terminal UI removal mapping. | Revise requirements/design and reroute. |
| 2026-05-23 | Code | `autobyteus-web/components/mobile/MobileTools.vue`; `rg -n "MobileTools|tools|grid-cols|MobileTaskTab|terminal|vnc" autobyteus-web/components/mobile/MobileWorkShell.vue autobyteus-web/types/mobileWork.ts autobyteus-web/stores/mobileWorkStore.ts autobyteus-web/utils/mobileFeatureGates.ts` | Verify current terminal UI surfaces for `AR-P1-003` | `MobileTools.vue` imports `Terminal` and `VncViewer`, labels the page "Terminal and VNC", and exposes `mobile-tools-tab-terminal`, `mobile-terminal-panel`, and `mobile-vnc-panel`. `MobileWorkShell.vue` imports/renders `MobileTools`, includes a Tools bottom tab, and uses a 5-column nav. `MobileTaskTab` includes `tools`; feature gates mark `terminal` and `vnc` supported. | Design must name all removal/update surfaces. |
| 2026-05-23 | Code | `rg -n "MobileTools|Tools|tools|terminal|vnc|Terminal|VNC" autobyteus-web/components/mobile/__tests__ autobyteus-web/utils/__tests__` | Verify test mapping for `AR-P1-003` | Mobile tests assert Tools/Terminal/VNC rendering and read `MobileTools.vue` source. Affected tests include `MobileRemoteAccessShell.spec.ts`, `MobileUxRefinement.spec.ts`, `MobileContextSelectionRegression.spec.ts`, and `mobileFeatureGates.spec.ts`. | Design must require tests to assert absence instead. |
| 2026-05-23 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts`; `autobyteus-server-ts/src/api/rest/remote-access.ts` | Verify current owner-route classification for `AR-P1-001` | `status` is public, `pairing-exchanges` is public, and `address-candidates`, settings, pairing sessions, device list, and revocation routes are all `LOCAL_ONLY`. No node-admin claim class exists. | Design must introduce a narrow Phone Access owner route class and claim validator. |
| 2026-05-23 | Code | `autobyteus-web/stores/phoneAccessStore.ts`; `autobyteus-web/components/settings/PhoneAccessCard.vue`; `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Verify current URL/QR behavior for `AR-P1-002` | Current UI/store use one selected normalized HTTPS candidate as `serverBaseUrl` for QR creation. `AddressCandidateService` runs inside the target backend and reports loopback/network-interface candidates from that environment, which is unsuitable as an automatic Android-facing Docker QR origin. | Design must split management and advertised URLs and verify same-node identity. |
| 2026-05-23 | Code | `autobyteus-web/components/settings/NodeManager.vue`; `autobyteus-web/stores/windowNodeContextStore.ts`; `autobyteus-web/types/node.ts` | Verify remote Docker window Phone Setup state for `AR-P1-001` and `AR-P1-002` | `NodeManager.vue` renders `PhoneAccessCard` only when `windowNodeContextStore.isEmbeddedWindow`; remote node windows show `phone-setup-remote-unavailable`. Node types are embedded/remote and window context supplies the selected node ID/base URL. | Design must replace remote unavailable steady state with claim-backed remote `PhoneAccessCard`. |

## Architecture Review Rework On 2026-05-23

Architecture review round 1 produced a `Fail / Design Impact` result, with the narrowed Phase One direction accepted in principle. The design package was revised as follows:

- `AR-P1-001` / node-admin claim boundary:
  - The launcher is now the issuer for launcher-managed mobile-safe Docker nodes.
  - The launcher generates `claimId`, raw secret, hash, and fixed `phone-access-management` scope.
  - The container receives only claim ID/hash/scope; raw secret stays in launcher local state and Electron main-process claim store.
  - Claim-backed owner requests use `X-Autobyteus-Node-Admin-Claim-Id` and `X-Autobyteus-Node-Admin-Claim` headers.
  - The route-policy design adds a `PHONE_ACCESS_OWNER` or equivalent route class for Phone Access management routes only, allowing loopback or valid claim.
  - Rotation/revocation for Phase One is launcher-owned; remote in-app minting is explicitly not in scope.
- `AR-P1-002` / Docker Android-facing origin:
  - The design now distinguishes desktop `managementBaseUrl` from Android `mobileAdvertisedBaseUrl`.
  - Remote Docker Phone Access setup requires a manual HTTPS advertised URL; in-container address candidates are diagnostic only.
  - Both management and advertised URLs must return the same stable `serverInstanceId` from `/rest/remote-access/status` before QR creation.
  - QR creation posts to the Docker node management URL with claim headers while encoding the verified advertised URL for Android.
- `AR-P1-003` / terminal UI removal:
  - The design now names `MobileTools.vue`, `MobileWorkShell.vue`, `MobileTaskTab`, `mobileWorkStore.ts`, `mobileFeatureGates.ts`, and affected mobile tests.
  - The current Tools/VNC page is removed from mobile Phase One; it is not retained as a VNC-only page.

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Desktop/web owner opens Settings → Nodes → Phone Setup on embedded node, enables Phone Access, enters HTTPS `/mobile` base, creates QR/link. Android scans/pastes the QR/link and loads the server `/mobile` web shell with the `pairing` query parameter.
- Current execution flow:
  1. Owner UI calls local-only Phone Access endpoints on the embedded server to enable settings and create a pairing session.
  2. `RemoteAccessPairingService` normalizes and HTTPS-checks the server base URL, creates a random 5-minute pairing code, stores the session in memory, and returns a `/mobile?pairing=<base64url-json>` URL/QR.
  3. Android parses the QR/link, stores only a native node profile, and loads the server `/mobile` web app with the pairing parameter in WebView.
  4. `/mobile` web code posts `pairingCode`, `serverBaseUrl`, and `deviceName` to public `/rest/remote-access/pairing-exchanges`.
  5. Backend consumes the code and issues a long-lived `mra_...` credential; only its SHA-256 hash is persisted server-side.
  6. `/mobile` stores the raw credential in WebView/browser `localStorage` and sends it as `Authorization: Bearer ...` on REST/GraphQL and as `access_token` on WebSocket URLs.
  7. Backend route policy accepts any valid mobile credential for `POST /graphql`, protected REST families, and `/ws/*`; GraphQL resolvers do not enforce per-operation mobile scopes.
- Ownership or boundary observations:
  - Pairing code lifecycle has a clear owner in `RemoteAccessPairingService`.
  - Device credential lifecycle has a clear but too-simple owner in `PairedDeviceService`.
  - Route-level authorization has an owner in `RemoteAccessRoutePolicy`, but operation-level authorization has no authoritative owner.
  - Mobile UI feature gates are not an authoritative security boundary.
  - Docker remote nodes are visible in the node registry/window model, but Phone Access management is embedded-node-only and local-only.
- Current behavior summary: Pairing links are reasonably short-lived/single-use, but the exchanged mobile credential is broad, long-lived, stored in web localStorage, and not scoped by node/capability/workspace. Docker nodes reduce runtime blast radius but are not first-class secure mobile targets today.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Security Hardening / Behavior Change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, Missing Invariant, Duplicated Policy Or Coordination, Shared Structure Looseness.
- Refactor posture evidence summary: Refactor required now. Adding ad-hoc denies to individual UI components or routes would leave backend operation authorization fragmented and would not address token lifetime/storage/node binding.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `remote-access-auth-service.ts` | `authorizeMobileCredential` checks only credential existence, revocation, and Phone Access enabled. | Missing authorization invariant; mobile credential is not scoped. | Add authoritative capability/session policy. |
| `remote-access-route-policy.ts` | Entire `/graphql` POST is `LOCAL_OR_MOBILE`. | Coarse endpoint policy allows high-risk operations through one gate. | Add GraphQL operation-level authorization. |
| GraphQL mutation list | Admin/settings/API-key/package/skills/MCP/migration mutations have no mobile-specific denial. | UI-only mobile feature hiding is not security. | Decorate or map operations to scopes. |
| `mobileCredentialStorage.ts` | Raw durable credential in `localStorage`. | Credential custody is weak for a native Android wrapper. | Move durable material to native secure storage. |
| Android network config | Cleartext allowed globally. | Bearer/session material can traverse HTTP if user pairs/uses HTTP origin. | Enforce HTTPS for production persisted sessions. |
| `NodeManager.vue` | Phone Access controls hidden for remote node windows. | Docker nodes are not first-class mobile pairing targets. | Add remote-node owner/admin channel and UI. |
| Docker launcher | `SYS_ADMIN`, `seccomp=unconfined`, all-interface ports, root, bind mounts. | Docker is safer than host but not hardened by default. | Add hardened launcher profile. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Android mobile shell docs | States credential storage remains in WebView `localStorage` for MVP. | Native app should now own durable credential custody. |
| `autobyteus-android/.../PairingLinkParser.kt` | Parse QR/link/payload and create WebView URL | Does not validate expiry; delegates exchange to web shell. | Acceptable if backend remains authoritative; add node/scope fields and HTTPS policy. |
| `autobyteus-android/.../NodeUrlNormalizer.kt` | Normalize node/mobile/status URLs | Allows HTTP and HTTPS. | Tighten release behavior. |
| `autobyteus-android/.../AutoByteusWebView.kt` | WebView setup | Reasonable containment; DOM storage enabled. | DOM storage is incompatible with high-trust durable tokens. |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | Remote access domain types | Auth context and device record are too loose/simple. | Expand into session, scope, node binding, workspace policy. |
| `remote-access-pairing-service.ts` | Pairing code/session lifecycle | Good TTL/single-use/HTTPS creation foundation. | Extend with approval/verifier and node/scopes. |
| `paired-device-service.ts` | Device record/credential issuance | Long-lived credential with hash/revocation only. | Replace with token/session service and rotate/expire. |
| `remote-access-auth-service.ts` | Bearer/loopback auth | Too coarse; no capability decisions. | Keep identity validation but delegate to authorization owner. |
| `remote-access-route-policy.ts` | HTTP route classification | Endpoint class only. | Remain thin; must not be the only security owner. |
| `api/graphql/index.ts`, `schema.ts` | GraphQL setup | No context auth checker. | Add Mercurius context + TypeGraphQL auth checker or equivalent operation guard. |
| `api/graphql/types/*` | Resolver operations | Mixed low-risk and high-risk operations behind same route. | Scope every operation; default mobile deny high-risk ops. |
| `api/websocket/terminal.ts` | Terminal WS endpoint | Uses same mobile credential then opens shell. | Standard mobile must deny this backend path and remove UI entrypoints; terminal remains desktop-only unless a separate future developer-mode design is approved. |
| `autobyteus-web/utils/remoteAccess/*` | Mobile auth transport/storage | Sends/stores raw credential. | Replace with token broker and short-lived WS token. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Owner Phone Access management | Embedded only; device list/revoke only. | Expand to node/scopes/audit/session management. |
| `autobyteus-web/components/settings/NodeManager.vue` | Node UI | Remote Phone Setup unavailable. | Add remote-node phone access using node-owner channel. |
| `scripts/public/docker/autobyteus-docker.sh`, `.ps1` | Public Docker node launcher | Current profile favors functionality and exposure over least privilege. | Add secure default/mobile-safe profile and explicit compatibility profile. |
| `remote-browser-bridge` files | Remote node browser bridge | Separate bridge tokens but GraphQL registration is broad. | Gate behind admin/browser-bridge scope. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-23 | Script | Python script scanning `@Mutation` in `autobyteus-server-ts/src/api/graphql/types` | Many high-risk mutations are reachable behind `POST /graphql` route classification if bearer is valid. | Operation-level GraphQL auth is mandatory. |
| 2026-05-23 | Static probe | `rg -n "pair|remote-access|mobile|credential|token|access_token|device" autobyteus-message-gateway/src` | No Android Phone Access pairing path in message gateway; only external channel credentials/webhooks. | Message gateway not current pairing owner, but its config mutations are part of GraphQL admin surface. |
| 2026-05-23 | Static probe | Docker launcher `docker run` inspection | Ports publish without `127.0.0.1:` prefix and server binds `0.0.0.0`. | Docker node backend/debug surfaces may be reachable beyond the local owner depending on Docker/network environment. |
| 2026-05-23 | Static probe | Terminal WebSocket + terminal session factory inspection | Accepted WS can spawn shell under workspace base path; node process boundary determines host vs container. | Mobile should not expose terminal; Docker pairing still reduces blast radius for agent work only if Docker is hardened and mounts are minimized. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: OWASP MASVS Storage checklist, `https://mas.owasp.org/checklists/MASVS-STORAGE/`.
  - Version / tag / commit / freshness: Public live checklist consulted on 2026-05-23.
  - Relevant contract, behavior, or constraint learned: Sensitive client credentials should use platform-appropriate protected storage and avoid leakage through logs/backups.
  - Why it matters: Supports moving Android durable session material out of WebView/localStorage and continuing token redaction.
- Public API / spec / issue / upstream source: OAuth 2.0 Device Authorization Grant RFC 8628, `https://datatracker.ietf.org/doc/html/rfc8628`.
  - Version / tag / commit / freshness: RFC 8628, consulted 2026-05-23.
  - Relevant contract, behavior, or constraint learned: Device pairing flows commonly use short-lived device codes plus separate user interaction/approval and expiry, rather than relying on possession of a code alone for high-authority access.
  - Why it matters: Useful reference shape for owner-approved pairing; not required as a dependency.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None used; this phase was static source investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree/branch creation only.
- Cleanup notes for temporary investigation-only setup: No temporary runtime services created.

## Findings From Code / Docs / Data / Logs

### 1. Pairing link vs mobile credential risk

The current pairing URL/QR is less dangerous than the exchanged credential because the backend pairing code is short-lived, one-time, in-memory, and HTTPS-required at creation. If an attacker steals the QR/link before the real phone exchanges it, they can race the legitimate phone and obtain the durable mobile credential. If they steal it after legitimate exchange, the code should already be consumed. There is no second owner-confirmation/verifier step at exchange time, so possession of the unconsumed pairing link is enough to enroll one device.

The exchanged credential is much more dangerous. It is long-lived until revoked, raw in web storage, sent to all REST/GraphQL requests, and sent as a WebSocket query parameter. The server stores only a hash, which is good for server at-rest protection, but a client-side leak of the raw credential grants broad access.

### 2. Android native shell security posture

Android uses reasonable WebView containment defaults: file access disabled, safe browsing enabled where available, mixed content denied, and navigation limited to same-origin AutoByteUs paths. Native backups are disabled and saved node profiles exclude the credential. However, the native shell intentionally delegates credential storage to `/mobile` WebView localStorage. That MVP boundary leaves the Android app unable to provide native secure credential custody.

Android also globally permits cleartext in network security config. The current docs encourage Tailscale Serve HTTPS, and the backend requires HTTPS when creating desktop QR sessions, but the app and web session transport can still use HTTP origins if the user acknowledges/uses them. For a bearer-token remote-control feature, production cleartext should be rejected or limited to explicit development mode.

### 3. Backend authorization posture

`RemoteAccessRoutePolicy` is a useful transport gate but not enough as the governing security owner. It classifies `POST /graphql`, `/ws/*`, and protected REST families as `LOCAL_OR_MOBILE`; then `RemoteAccessAuthService` only validates bearer existence/revocation/Phone Access enabled. There is no capability, scope, node binding, workspace binding, token expiry, idle timeout, or operation classification in the auth context.

Because GraphQL is one endpoint, this allows a default mobile credential to reach desktop/admin mutation surfaces unless each resolver prevents it. Current `type-graphql` schema setup has no auth checker or context guard. Static mutation listing shows high-risk operations across settings, API keys, skill/package/MCP management, messaging gateway, migrations, workspace, file operations, run/tool approval, and browser bridge.

### 4. Host control and terminal risk

The user's concern is valid. A mobile credential can reach workspace/file/run/terminal surfaces. Terminal WS currently authenticates with the same mobile credential and then starts shell access for a workspace. On the embedded desktop node this can reach host workspace paths and the host process environment. If an attacker can obtain or create a workspace pointing at sensitive host paths, risk increases further. The user clarified that terminal-on-phone is also low value because command entry and terminal viewing are inconvenient on mobile. This strengthens the design direction: remove/disable terminal for the standard mobile product rather than keeping it as a normal scope. File viewing may remain useful, but should be read-only and restricted to allowed run artifacts/workspace files. Even without terminal, agent/tool approval/file mutation operations are powerful enough to exfiltrate data if not scoped.

### 5. Docker node security and pairing feasibility

A Docker-backed remote node is directionally safer because work executes in the container process boundary, and Docker node auth state/workspace can be separate from the host. It does not fully solve the problem today:

- The launcher grants broad Linux capability and disables seccomp confinement.
- The container runs as root and persists `/root` in a named volume.
- Backend, VNC, noVNC, and debug ports are published to host ports without loopback-only binding.
- Host-backed workspace and shared folders are mounted into the container automatically; after user clarification, the mobile-safe default should remove automatic shared mounts and allow only explicit user-selected mounts at container creation time.
- The server advertises HTTP localhost URLs by default.
- Phone Access management endpoints are local-only inside the node; host-to-container published-port requests are not loopback from the container's point of view.
- The remote-node Electron window hides Phone Access controls.

Therefore, Android cannot currently be paired with a Docker node through the normal desktop UI as a first-class secure flow. A new node-owner/admin management channel is required.

### 6. Browser bridge risk

Remote browser sharing is separate from Android Phone Access and has its own descriptor/token flow. It is disabled by default and tokenized, but the remote node registers/clears the bridge through GraphQL mutations. Since default mobile bearer access currently reaches GraphQL broadly, the design must explicitly gate remote browser bridge registration behind admin/browser-bridge scope and not default mobile scope.

## Constraints / Dependencies / Compatibility Facts

- Existing Phone Access management endpoints intentionally use loopback trust for local owner controls. Do not simply treat all Docker bridge requests as local; that would weaken remote-node isolation.
- Browser WebSocket authentication cannot rely on arbitrary headers, so a query token may still be needed, but it must be short-lived/one-time and not the durable secret.
- Current Android app can be improved significantly because it is native WebView; pure web/PWA clients cannot protect durable secrets as strongly.
- Existing paired devices will likely need to be invalidated/re-paired because clean security cannot preserve the old broad bearer semantics.
- Docker hardening may need feature profiles because VNC/noVNC/browser automation/debug features can require broader privileges or exposure. Automatic shared mounts should not be part of the mobile-safe profile; explicit creation-time mounts can remain a separate user/company choice.

## Open Unknowns / Risks

- Exact list of current mobile UI operations that must remain allowed after scoping requires implementation-time inventory and tests; terminal should be removed from that allowed set, while read-only file viewing should be evaluated for usability.
- Active WebSocket kill/revocation may require adding a central session/channel registry not present today.
- Some Docker features may fail under least-privilege settings and require documented compatibility toggles.
- The exact native Android JS bridge/API for token brokering must be designed carefully to avoid re-exposing durable tokens to JavaScript.

## Notes For Architect Reviewer

The design should not be addition-only. The current broad mobile bearer model is the design problem. A valid design should make `RemoteAccessRoutePolicy` a thin transport facade, add one authoritative authorization/session owner, and remove/disable the legacy long-lived `mra_...` mobile credential path. The remote Docker-node pairing path should not relax loopback trust; it needs a separate node-owner/admin claim channel.

## Scope Refinement On 2026-05-23

The user refined the ticket priority after reviewing the broader security design:

- Current ticket / Phase One should focus on making Android pair with a mobile-safe Docker node.
- The intended user flow is: create mobile-safe Docker container, add/open it as a remote node, use the separate Electron window connected to that Docker node, then create Phone Access QR from that Docker node window and pair Android to that Docker node.
- Broader backend mobile authorization hardening should move to a future ticket. Created future ticket doc at `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/docs/future-tickets/mobile-backend-authorization-hardening.md`.
- User explicitly approved routing to architecture review after requesting detailed Phase Two future documentation.
