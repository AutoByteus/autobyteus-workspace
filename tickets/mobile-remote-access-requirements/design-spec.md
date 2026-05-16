# Design Spec

## Current-State Read

AutoByteus today is a desktop-first Electron application that starts a bundled Node/Fastify server and opens the renderer against the embedded node at `http://127.0.0.1:29695`.

Current execution and ownership facts:

- Electron server managers (`autobyteus-web/electron/server/*ServerManager.ts`) start `autobyteus-server-ts/dist/app.js --port 29695 --data-dir <server-data>` and set `AUTOBYTEUS_SERVER_HOST` to the loopback embedded URL.
- Server CLI defaults to `host: "0.0.0.0"`, so the server can be reachable from another device over LAN/Tailscale/Headscale/company VPN if firewall and ACLs allow it.
- Fastify app construction (`autobyteus-server-ts/src/server-runtime.ts`) registers CORS, multipart, websocket, REST, WebSocket routes, and GraphQL without a shared app-level access-control owner.
- REST routes are grouped under `/rest` but each route file registers handlers directly. GraphQL is registered through Mercurius at `/graphql`. WebSocket handlers directly register `/ws/agent`, `/ws/agent-team`, `/ws/terminal`, `/ws/file-explorer`, and application notification sockets.
- The frontend has a strong node abstraction: `deriveNodeEndpoints(baseUrl)` derives REST, GraphQL, health, and WebSocket endpoints from one normalized node base URL; `windowNodeContextStore` owns the active bound node context; `nodeStore` has an Electron node registry and browser-mode localStorage fallback.
- Current API transports do not have a shared auth owner: `services/api.ts` creates Axios clients without auth, `plugins/30.apollo.client.ts` creates Apollo clients without auth, and WebSocket clients open bare URLs.
- Some flows still use global runtime config / `getServerUrls()` instead of the bound node context, notably context attachment presentation and older audio/transcription paths. Mobile-supported flows must not rely on static `localhost` or loopback URLs.
- The server currently does not serve a mobile/PWA frontend. Electron renderer assets are generated and packaged separately; server package preparation copies only the server bundle into `resources/server`.
- Existing remote browser pairing is adjacent but not app-wide mobile authentication. It registers an expiring browser bridge descriptor through GraphQL; it must not be reused as the phone-device auth model.

Current coupling / fragmentation pressure:

1. Remote access would be unsafe if implemented as “just open the web UI on phone” because reachable network peers could call the current API surface.
2. Adding auth route-by-route would duplicate policy across REST, GraphQL, WebSocket, and future routes.
3. Adding mobile node binding separately from `windowNodeContextStore` would create parallel endpoint truth.
4. Serving a PWA without addressing generated URL/base URL policy would leak `127.0.0.1` URLs to remote clients.
5. Building Android first would not solve the shared Remote Access boundary; native wrappers should consume the same PWA pairing/auth protocol.

Constraints the target design must respect:

- Existing desktop loopback behavior must remain simple and reliable.
- Product must remain VPN-provider agnostic while using Tailscale as first validation path.
- iOS/Android cannot use Electron preload APIs.
- Browser WebSocket cannot set arbitrary auth headers; the WebSocket auth mechanism must account for this.
- First milestone should cover a selected mobile-supported slice, not the entire desktop UI.

## Intended Change

Introduce **AutoByteus Remote Access** as a cross-platform capability that lets a phone client pair with and use a desktop/server node over any private network.

First implementation target:

- Mobile web/PWA-first, served by the desktop/server under `/mobile`.
- Desktop Settings > Nodes / Phone Access card generates a time-limited QR pairing payload.
- Phone opens/scans the mobile web URL, exchanges one-time pairing code, stores a paired-node credential, binds `windowNodeContextStore` to that node, and calls selected mobile-supported flows.
- Server enforces app-level auth for non-loopback REST/GraphQL/WebSocket access while preserving local desktop loopback access under a named local-trust policy.
- Tailscale is the first validation network, not a product dependency.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Missing Invariant; Duplicated Policy Or Coordination risk
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes for production-supported Remote Access; no for a throwaway network smoke test.
- Evidence:
  - `server-runtime.ts` registers REST/GraphQL/WebSocket without shared auth.
  - `api/rest/index.ts`, `api/graphql/index.ts`, and `api/websocket/index.ts` expose separate route families.
  - Frontend API clients do not share auth propagation.
  - Electron sets `AUTOBYTEUS_SERVER_HOST` to loopback while remote clients need private-network URLs.
  - Nuxt static output exists, but server package does not serve mobile assets.
- Design response:
  - Add a server Remote Access capability area that owns pairing sessions, paired devices, credential verification, route policy, and address candidates.
  - Add a web mobile access capability area that owns mobile bootstrap, credential storage, auth transports, and Electron feature gating.
  - Extend packaging to build/copy mobile web assets into server resources and serve them under `/mobile`.
- Refactor rationale:
  - Route protection, auth token handling, and node binding are cross-cutting. They need authoritative boundaries rather than scattered checks.
- Intentional deferrals and residual risk, if any:
  - Native Android/iOS wrappers are deferred until PWA MVP protocol is proven.
  - HTTPS/certificate polish is deferred; MVP can run over private network HTTP with app-level auth and explicit documentation.
  - Full desktop UI mobile parity is deferred; MVP gates unsupported features.

## Terminology

- `Remote Access`: AutoByteus app-level capability for phone clients to pair with and access a node over a reachable private network.
- `Private Network Provider`: LAN, Tailscale, Headscale, NetBird, Netmaker/WireGuard, company VPN, or similar transport. It is not part of the core app protocol.
- `Phone Access`: Desktop user-facing settings surface for enabling/pairing/revoking phone clients.
- `Pairing Session`: Short-lived, memory-only one-time authorization to create a paired device credential.
- `Paired Device`: Durable phone/client record with hashed credential and revocation state.
- `Mobile Node Session`: Frontend runtime state that binds a phone/PWA to one paired node and supplies auth to API transports.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: do not add a parallel “mobile localhost config” path or native-only protocol. Replace mobile-supported global URL lookups with bound-node URL access.
- Treat removal as first-class design work: route/auth policy must be centralized; old mobile-supported uses of `getServerUrls()` that bypass bound node context are decommissioned in scope.
- Decision rule: the design rejects a Tailscale-specific core integration and rejects route-by-route auth snippets.

## Spine Coverage Rule

Every in-scope use case must map to at least one explicit data-flow spine in this design. A separate spine is required when the behavior crosses one of these boundaries:

- desktop UI ↔ server API,
- phone/PWA ↔ server API,
- HTTP ↔ WebSocket transport,
- unauthenticated ↔ authenticated trust state,
- volatile session ↔ persisted credential/settings state,
- local loopback ↔ non-loopback private-network client,
- server-generated data ↔ client-visible URL/artifact,
- desktop-only capability ↔ mobile-safe capability.

Tiny single-component UI interactions do not need their own spine, but every product behavior that can create security, persistence, reachability, auth, or mobile-runtime bugs does. The use-case coverage matrix below is therefore part of the design contract, not illustrative commentary.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-MRA-001 | Primary End-to-End | Desktop Settings Phone Access card | QR pairing payload visible to user | Phone Access Pairing Coordinator | Makes setup no-config and prevents raw URL/token handling by normal users. |
| DS-MRA-002 | Primary End-to-End | Phone first-run mobile web | Paired mobile node session stored and active | Mobile Pairing Bootstrap | Converts private-network reachability into usable authenticated app access. |
| DS-MRA-003 | Primary End-to-End | Mobile UI REST/GraphQL action | Existing server domain service executes or rejects | Remote Access Route Policy | Ensures mobile access is safe across HTTP APIs. |
| DS-MRA-004 | Primary End-to-End | Mobile UI WebSocket stream open | Existing stream handler attaches or rejects | Remote Access Route Policy | WebSocket is critical for agent/team/terminal/file flows and needs auth too. |
| DS-MRA-005 | Primary End-to-End | Desktop per-device revoke action | Future requests from that phone fail | Paired Device Service | Gives user per-device control and proves credential lifecycle works. |
| DS-MRA-006 | Primary End-to-End | Phone browser opens `/mobile` | Nuxt mobile app bootstraps | Mobile Web Static Host | Establishes PWA-first delivery without native Android first. |
| DS-MRA-007 | Primary End-to-End | Mobile requests file/media/artifact/application URL | Phone receives usable private-network URL or transport-neutral path | Client-Facing URL Resolver | Prevents loopback URL leakage and broken previews. |
| DS-MRA-008 | Primary End-to-End | QA phone connected through Tailscale | REST, GraphQL, WebSocket validation evidence | Remote Access Validation Profile | Proves the product path with low VPN setup effort. |
| DS-MRA-009 | Primary End-to-End | Desktop Phone Access enable/disable toggle | Pairing/mobile auth availability changes persistently | Remote Access Settings Service | Covers the global on/off product control and avoids ambiguous disabled semantics. |
| DS-MRA-010 | Primary End-to-End | Desktop address candidate/manual URL selection | Pairing payload contains selected reachable node base URL | Address Candidate Service | Keeps LAN/Tailscale/Headscale/company VPN provider-neutral and no-config for normal users. |
| DS-MRA-011 | Primary End-to-End | Phone/PWA app reopen | Prior paired node reconnects or asks to pair again | Mobile Node Session Store | Covers “works when I am away” returning-user behavior. |
| DS-MRA-012 | Primary End-to-End | Mobile user enters supported/unsupported app area | Supported UI executes or unsupported state appears without Electron calls | Mobile Feature Gates | Prevents mobile runtime crashes and accidental desktop-only controls. |
| DS-MRA-013 | Primary End-to-End | Desktop revoke-all paired phones action | Every existing phone credential fails | Paired Device Service | Covers user emergency reset and R-MRA-076. |
| DS-MRA-014 | Primary End-to-End | User/admin follows private-network setup profile | Reachable provider-agnostic node URL is available for pairing/manual entry | Remote Access Documentation Profile | Ensures Tailscale is validation/docs convenience, not a core dependency. |
| RS-MRA-001 | Return-Event | Server rejects HTTP/GraphQL auth | Mobile connection diagnostic displays actionable reason | Mobile Connection Diagnostics | Distinguishes auth-required, revoked, disabled, and incompatible states. |
| RS-MRA-002 | Return-Event | Server rejects WebSocket auth/connection | Mobile stream UI maps close code to recovery action | Mobile Connection Diagnostics | Prevents silent stream failure and covers WebSocket-blocked/auth failures. |
| RS-MRA-003 | Return-Event | Pairing session expires or is consumed | Desktop QR and phone pairing UI show expired/retry state | Pairing Session Registry | Keeps one-time QR lifecycle understandable and safe. |
| RS-MRA-004 | Return-Event | Phone cannot reach server/private network | Mobile bootstrap/reconnect shows network troubleshooting | Mobile Connection Diagnostics | Covers away-from-home/firewall/VPN failures. |
| RS-MRA-005 | Return-Event | User reaches mobile-unsupported feature | Unsupported state explains limitation and safe alternative | Mobile Feature Gates | Prevents broken controls while preserving discoverability. |
| BLS-MRA-001 | Bounded Local | Pairing session creation | Expired session removed / rejected | Pairing Session Registry | Keeps one-time QR codes bounded and safe. |
| BLS-MRA-002 | Bounded Local | Device credential verification | Credential cache hit/miss/update | Remote Access Auth Service | Keeps per-request auth efficient and revocation-aware. |
| BLS-MRA-003 | Bounded Local | Mobile app loads persisted session | Session shape validates and binds node context | Mobile Node Session Store | Makes reconnect reliable without parallel endpoint truth. |
| BLS-MRA-004 | Bounded Local | Settings enabled flag changes | Auth/pairing caches observe new enabled state | Remote Access Settings Service | Ensures disabling Phone Access takes effect consistently. |

## Use-Case-To-Spine Coverage Matrix

| Use Case | Primary Spine Coverage | Return/Error Spine Coverage | Coverage Notes |
| --- | --- | --- | --- |
| UC-MRA-001: Personal user runs desktop; desktop starts bundled server | DS-MRA-006, DS-MRA-009 | RS-MRA-004 | `/mobile` and Phone Access status depend on the server running; unavailable server maps to diagnostics. |
| UC-MRA-002: User enables Phone Access and receives QR/pairing flow | DS-MRA-001, DS-MRA-009, DS-MRA-010 | RS-MRA-003 | Enable state, candidate URL, and QR session are separate spine responsibilities. |
| UC-MRA-003: Phone opens PWA/mobile app, scans/imports QR, pairs | DS-MRA-002, DS-MRA-006 | RS-MRA-001, RS-MRA-003, RS-MRA-004 | Pairing covers first-run, expired code, auth disabled, and network unreachable. |
| UC-MRA-004: Phone later reconnects away from home without manual setup | DS-MRA-011, DS-MRA-003, DS-MRA-004 | RS-MRA-001, RS-MRA-002, RS-MRA-004 | Reopen loads credential, binds node, health-checks, and maps failures. |
| UC-MRA-005: User uses Tailscale private network path | DS-MRA-008, DS-MRA-010, DS-MRA-014 | RS-MRA-004 | Tailscale is a validation/setup profile feeding the same selected base URL. |
| UC-MRA-006: Advanced user uses Headscale | DS-MRA-010, DS-MRA-014 | RS-MRA-004 | Headscale is treated as a tailnet-like/private URL profile, not core logic. |
| UC-MRA-007: Company user uses corporate VPN/internal hostname | DS-MRA-010, DS-MRA-014 | RS-MRA-004 | Manual/advanced URL override and docs cover company DNS/VPN. |
| UC-MRA-008: Advanced/company user uses NetBird/Netmaker/WireGuard | DS-MRA-010, DS-MRA-014 | RS-MRA-004 | Same provider-agnostic URL flow; no provider SDK in app core. |
| UC-MRA-009: User sees understandable connection diagnostics | RS-MRA-001, RS-MRA-002, RS-MRA-004, RS-MRA-005 | N/A | Diagnostics are return/event spines because they originate from rejected/failed primary spines. |
| UC-MRA-010: Desktop user views/revokes paired phone clients | DS-MRA-005, DS-MRA-013, DS-MRA-009 | RS-MRA-001, RS-MRA-002 | Covers per-device revoke, revoke-all, and disabled state. |
| UC-MRA-011: Mobile user uses supported server-owned flows | DS-MRA-003, DS-MRA-004, DS-MRA-007, DS-MRA-012 | RS-MRA-001, RS-MRA-002, RS-MRA-005 | REST/GraphQL/WS execution, generated URLs, and mobile gating all participate. |
| UC-MRA-012: Mobile user is not shown broken desktop/Electron-only controls | DS-MRA-012 | RS-MRA-005 | Feature gates are the governing owner; no direct Electron API access in mobile paths. |

## Primary Execution Spine(s)

- DS-MRA-001: `Desktop Settings -> PhoneAccessStore -> Pairing Session API (loopback-only) -> RemoteAccessPairingService -> PairingPayloadComposer -> QR Panel`
- DS-MRA-002: `Phone /mobile first-run -> MobilePairingBootstrap -> Pairing Exchange API -> RemoteAccessPairingService -> PairedDeviceStore -> MobileNodeSessionStore -> WindowNodeContextStore`
- DS-MRA-003: `Mobile UI Action -> Authorized HTTP Transport -> Fastify RemoteAccessRoutePolicy -> Existing REST/GraphQL Handler -> Domain Service -> Response`
- DS-MRA-004: `Mobile Stream UI -> Authenticated WebSocket URL Builder -> Fastify/WS RemoteAccessRoutePolicy -> Existing WebSocket Handler -> Stream Service -> Event Messages`
- DS-MRA-005: `Desktop Phone Access Devices -> Per-device Revoke API (loopback-only) -> PairedDeviceService -> PairedDeviceStore -> Auth Cache Invalidation -> Rejected Future Mobile Request`
- DS-MRA-006: `Phone Browser -> /mobile Static Host -> Nuxt Mobile App -> MobileNodeSessionStore -> First-Run or Bound Node Shell`
- DS-MRA-007: `Server/File/Artifact Producer -> ClientFacingUrlResolver or Transport-Neutral Path -> Mobile Bound URL Builder -> Authorized Phone Fetch/Preview`
- DS-MRA-008: `QA Tailscale Tailnet -> Phone Browser -> Desktop Tailnet URL -> /mobile + /rest + /graphql + /ws -> Validation Report`
- DS-MRA-009: `Desktop Phone Access Toggle -> PhoneAccessStore -> Settings API (loopback-only) -> RemoteAccessSettingsService -> RemoteAccessSettingsStore -> Pairing/Auth Availability`
- DS-MRA-010: `Desktop Phone Access Candidate Picker -> AddressCandidateService/manual override -> Selected serverBaseUrl -> Pairing Session Payload -> Phone Connect URL`
- DS-MRA-011: `Phone/PWA Reopen -> MobileCredentialStorage -> MobileNodeSessionStore -> WindowNodeContextStore -> Health/Status Check -> Connected or Recovery State`
- DS-MRA-012: `Mobile Shell Route -> MobileFeatureGates -> Supported Flow Component or Unsupported State -> No Electron API Call`
- DS-MRA-013: `Desktop Revoke All -> PhoneAccessStore -> DELETE /rest/remote-access/devices -> PairedDeviceService.revokeAllDevices -> Auth Cache Invalidation -> All Future Mobile Requests Rejected`
- DS-MRA-014: `Docs/Profile Setup -> User/Admin obtains reachable private URL -> Manual/Candidate URL Entry -> Same Pairing/Auth Spines`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-MRA-001 | Desktop user asks to pair a phone. The desktop UI requests a loopback-only pairing session from the server. The server creates a short-lived code and returns a QR payload that contains the chosen node URL and pairing code, not a long-lived credential. | Phone Access UI, Pairing Session API, Pairing Service, QR Payload | Phone Access Pairing Coordinator | Address candidates, QR rendering, expiry timer |
| DS-MRA-002 | Phone opens mobile web, receives/imports pairing payload, calls exchange endpoint with one-time code, receives device credential, stores it, and binds node context. | Mobile Bootstrap, Pairing Exchange, Paired Device Store, Mobile Node Session | Mobile Pairing Bootstrap | Credential storage, URL normalization, diagnostics |
| DS-MRA-003 | Mobile runs a supported HTTP/GraphQL action. Transport adds credential. Server route policy verifies credential or loopback trust before existing handler executes. | Authorized Transport, Route Policy, Auth Service, Existing Handler | Remote Access Route Policy | Token redaction, last-seen update, error mapping |
| DS-MRA-004 | Mobile opens WebSocket using the query-token helper. Server verifies before connecting to the existing stream handler and maps failures to close codes. | WS URL Builder, Route Policy, WS Auth Adapter, Stream Handler | Remote Access Route Policy | Close codes, reconnect, token redaction |
| DS-MRA-005 | Desktop revokes one paired device. Store marks that credential revoked. Auth service rejects subsequent REST/GraphQL/WebSocket requests from that device. | Device Management UI, Device Service, Device Store, Auth Service | Paired Device Service | Audit metadata, cache invalidation |
| DS-MRA-006 | Phone loads the mobile web assets served by the desktop server. App either enters first-run pairing or loads the persisted paired node session. | Static Host, Nuxt Mobile App, Mobile Session Store | Mobile Web Static Host | Packaging, base URL, PWA manifest/service worker later |
| DS-MRA-007 | Any file/media/artifact URL exposed to mobile is generated from a client-facing base or a transport-neutral path and resolved against the bound node. | URL Producer, URL Resolver, Bound URL Builder | ClientFacingUrlResolver | Loopback avoidance, artifact tests |
| DS-MRA-008 | QA uses Tailscale as first private network profile to test phone-to-desktop behavior without router/VPN effort. | Test Phone, Tailscale Tailnet, Desktop Server, Validation Scripts | Remote Access Validation Profile | Firewall notes, MagicDNS/IP capture |
| DS-MRA-009 | Desktop enables or disables Phone Access. Settings persist, pairing creation/exchange observes the flag, and mobile credential auth rejects while disabled. | Phone Access UI, Settings API, Settings Service, Auth Service | Remote Access Settings Service | Auth cache invalidation, clear disabled diagnostics |
| DS-MRA-010 | Desktop chooses a reachable node URL from discovered candidates or manual override. The pairing payload carries that normalized base URL, and the phone uses it for exchange and future reconnects. | Candidate Service, Manual Override, Pairing Payload | Address Candidate Service | Provider labels, firewall notes, URL normalization |
| DS-MRA-011 | On reopen, the phone loads stored paired-node metadata and credential, binds the active node, checks health/status, and either reconnects or shows a recovery state. | Credential Storage, Mobile Session Store, Node Context, Status API | MobileNodeSessionStore | Storage corruption, revoked/disabled handling, network offline |
| DS-MRA-012 | The mobile shell checks feature gates before rendering server-owned flows. Supported flows use authorized transports; unsupported/Electron-only areas show safe states and never call preload APIs. | Mobile Shell, Feature Gates, Supported Flow Components | Mobile Feature Gates | Responsive layout, unsupported copy, telemetry later |
| DS-MRA-013 | Desktop performs revoke-all. The device service marks every active device revoked, invalidates auth caches, and every phone must pair again. | Phone Access UI, Revoke-All API, Device Service, Auth Service | Paired Device Service | Dangerous-action confirmation, result count |
| DS-MRA-014 | Documentation/setup profiles help users obtain a reachable private URL via LAN, Tailscale, Headscale, company VPN, NetBird, Netmaker, or WireGuard. That URL feeds the same candidate/manual pairing flow. | Setup Guide, Private Network URL, Candidate/Manual Entry | Remote Access Documentation Profile | Provider drift, firewall guidance, no core SDK dependency |

## Spine Actors / Main-Line Nodes

- Phone Access UI
- PhoneAccessStore
- Remote Access Pairing API
- RemoteAccessPairingService
- RemoteAccessSettingsService
- PairedDeviceService
- RemoteAccessAuthService
- RemoteAccessRoutePolicy
- AddressCandidateService
- ClientFacingUrlResolver
- Mobile Web Static Host
- MobilePairingBootstrap
- MobileNodeSessionStore
- MobileCredentialStorage
- MobileConnectionDiagnostics
- MobileFeatureGates
- Authorized API transports
- WindowNodeContextStore
- Existing REST/GraphQL/WebSocket handlers
- Remote Access Documentation Profile
- Remote Access Validation Profile

## Ownership Map

| Main-Line Node | Owns |
| --- | --- |
| Phone Access UI | User-facing setup/enable/revoke/status composition; not credential verification. |
| PhoneAccessStore | Frontend orchestration for local Phone Access APIs, settings, QR/device UI state, per-device revoke, and revoke-all. |
| Remote Access Pairing API | Transport entrypoint for creating/exchanging pairing sessions. |
| RemoteAccessPairingService | Pairing session lifecycle, code validation, exchange sequencing, QR payload semantics. |
| RemoteAccessSettingsService | Persistent Phone Access enabled/disabled state and cache invalidation trigger. |
| PairedDeviceService | Durable device lifecycle, revoke, revoke-all, last-seen updates, device list projection. |
| RemoteAccessAuthService | Credential hash verification, local-loopback trust policy, settings-state check, request auth context. |
| RemoteAccessRoutePolicy | Decides whether a request route is public/local/mobile/external-signature/default-protected and invokes AuthService before handlers. |
| AddressCandidateService | Provider-agnostic URL candidate discovery and manual override normalization. |
| ClientFacingUrlResolver | Converts server/local generated paths to remote-safe client-facing URLs. |
| Mobile Web Static Host | Serves mobile web assets under server origin; does not own app auth. |
| MobilePairingBootstrap | First-run pairing flow and transition into active mobile node session. |
| MobileNodeSessionStore | Persisted paired-node metadata and credential; binds node context; reconnect state. |
| MobileCredentialStorage | PWA credential storage adapter and native secure-storage seam. |
| MobileConnectionDiagnostics | Maps network/auth/WebSocket/unsupported failures to user-actionable states. |
| MobileFeatureGates | Runtime supported/unsupported feature classification for mobile shell. |
| Authorized API transports | Adds credential to REST/GraphQL/WebSocket calls; centralizes auth propagation. |
| WindowNodeContextStore | Active node base URL and derived endpoints; remains authoritative endpoint source. |
| Existing REST/GraphQL/WebSocket handlers | Existing domain behavior after auth gate passes. |
| Remote Access Documentation Profile | Provider setup instructions that produce reachable URLs without entering app core. |
| Remote Access Validation Profile | Executable/manual LAN/Tailscale/private-network validation evidence. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Fastify REST route files | RemoteAccessRoutePolicy + existing domain services | HTTP transport entrypoints | App auth policy duplicated per route |
| Mercurius `/graphql` route | RemoteAccessRoutePolicy + TypeGraphQL resolvers | GraphQL transport entrypoint | Resolver-specific mobile auth policy for MVP |
| WebSocket route files | RemoteAccessRoutePolicy + stream services | Browser stream transport entrypoints | Token parsing policy duplicated per socket |
| Phone Access Vue component | PhoneAccessStore + server RemoteAccess services | User-facing settings surface | Pairing/session security decisions |
| Mobile PWA route/page | MobilePairingBootstrap + MobileNodeSessionStore | User-facing mobile shell | Parallel endpoint derivation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Mobile-supported use of global `getServerUrls()` | Bypasses bound node context and can point to localhost/loopback | `windowNodeContextStore.getBoundEndpoints()` plus URL builders | In This Change for MVP flows | Audit context attachment/media/application flows used by mobile slice |
| Bare mobile REST/Apollo/WebSocket calls | Missing credential propagation | Authorized API transport layer | In This Change | Existing desktop loopback remains via local trust policy |
| Route-by-route auth snippets | Would duplicate policy and miss routes | `RemoteAccessRoutePolicy` | In This Change | Use route allowlist/policy map |
| Core Tailscale-specific connection logic | Product must be VPN-agnostic | Provider-agnostic node URL and docs profiles | In This Change | Tailscale only in validation/docs |
| Production mobile build defaulting to `localhost:8000` | Generic phone build cannot point to localhost | Mobile runtime pairing / same-origin default | In This Change | Keep dev defaults for dev profile only |
| GraphiQL available to non-loopback remote clients | Exposes introspection/dev surface on remote network | Loopback/development-only GraphiQL policy | In This Change | If auth policy cannot selectively hide, disable in production remote profile |

## Return Or Event Spine(s) (If Applicable)

- RS-MRA-001: `RemoteAccessRoutePolicy HTTP/GraphQL rejection -> structured HTTP/GraphQL error code -> AuthorizedTransport error mapper -> MobileConnectionDiagnostics -> user-facing recovery action`
- RS-MRA-002: `RemoteAccess WebSocket auth rejection / blocked socket -> close code + reason -> AuthorizedTransport/WebSocket client mapper -> MobileConnectionDiagnostics -> reconnect/re-pair/network guidance`
- RS-MRA-003: `Pairing session expiry/single-use completion -> PairingSessionRegistry invalidates code -> QR panel countdown and phone pairing UI show expired -> user generates a new QR`
- RS-MRA-004: `Network/private route failure -> health/status fetch timeout or DNS/connect error -> MobileConnectionDiagnostics -> user sees firewall/VPN/desktop-asleep guidance`
- RS-MRA-005: `Mobile route reaches unsupported desktop-only feature -> MobileFeatureGates returns unsupported -> safe unsupported state renders -> no Electron API call occurs`

## Bounded Local / Internal Spines (If Applicable)

- BLS-MRA-001 parent owner: `RemoteAccessPairingService`
  - Chain: `create session -> store memory entry -> schedule/compute expiry -> exchange succeeds or expiry rejects -> remove session`
  - Why it matters: QR code must be single-use and short-lived.
- BLS-MRA-002 parent owner: `RemoteAccessAuthService`
  - Chain: `request credential -> normalize auth input -> hash/lookup -> verify non-revoked -> check Phone Access enabled -> produce auth context -> optional last-seen update/cache refresh`
  - Why it matters: Auth runs on every remote request and must be efficient, settings-aware, and revocation-aware.
- BLS-MRA-003 parent owner: `MobileNodeSessionStore`
  - Chain: `load persisted session -> validate shape -> bind node context -> check health/status -> emit connected/recovery state -> clear/re-pair on auth failure`
  - Why it matters: App reopen must reconnect without manual setup or parallel endpoint truth.
- BLS-MRA-004 parent owner: `RemoteAccessSettingsService`
  - Chain: `load settings -> set enabled flag -> persist -> invalidate auth/pairing cache -> route policy observes new state`
  - Why it matters: Disabling Phone Access must be consistent across pairing, REST, GraphQL, and WebSocket.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Address candidate discovery | DS-MRA-001, DS-MRA-010, DS-MRA-014 | Phone Access UI / Pairing Service | List LAN/tailnet-like/private IP candidates and manual URL | Helps QR choose reachable base URL | Pollutes pairing with provider-specific logic |
| QR rendering | DS-MRA-001 | Phone Access UI | Render pairing payload using existing `qrcode` dependency | Product onboarding polish | Security/session semantics hidden in UI |
| Credential hashing/redaction | DS-MRA-002, DS-MRA-003, DS-MRA-004 | Auth Service | Store only hashes; redact tokens from logs/errors | Prevents credential leakage | Repeated ad hoc token handling |
| Local loopback trust policy | DS-MRA-001, DS-MRA-003, DS-MRA-004 | Auth Service / Route Policy | Allow desktop embedded loopback without mobile credential based on peer socket address | Keeps desktop working cleanly | Accidental remote bypass if mixed into handlers or headers |
| Phone Access settings persistence | DS-MRA-009, BLS-MRA-004 | Settings Service | Persist enabled/disabled state | Gives user global control | Disabling only affecting UI but not auth, or vice versa |
| Revoke-all dangerous action confirmation | DS-MRA-013 | Phone Access UI | Confirm and summarize revocation count | Avoids accidental device reset | Device service polluted with UI concerns |
| PWA packaging/copy | DS-MRA-006 | Mobile Web Static Host | Build and copy mobile assets into server package | Makes `/mobile` available in packaged desktop | Entangles Electron renderer and server package |
| Mobile capability gating | DS-MRA-012, RS-MRA-005 | Mobile Shell | Hide/replace Electron-only features | Avoids runtime crashes | Desktop-only assumptions spread through pages |
| Diagnostics wording | RS-MRA-001..005 | Mobile Connection Diagnostics | Map technical failures to user actions | Makes remote network issues supportable | Network/auth/UI failures become indistinguishable |
| Validation profiles | DS-MRA-008, DS-MRA-014 | Delivery/QA | Define LAN/Tailscale/Headscale/company VPN tests | Ensures provider-agnostic behavior | False confidence from localhost-only tests |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Endpoint derivation | `autobyteus-web/utils/nodeEndpoints.ts` | Reuse/Extend | Already centralizes base URL -> endpoint mapping | N/A |
| Active node binding | `windowNodeContextStore` | Reuse/Extend | Correct authoritative frontend node context | N/A |
| Node registry | `nodeStore` | Reuse cautiously | Browser fallback useful; mobile credential must be separate | N/A |
| Remote browser bridge pairing | `remoteBrowserSharingStore` / `RemoteBrowserBridgeResolver` | Do Not Reuse as core | It pairs a browser tool bridge, not phone app auth | Create new app-wide Remote Access subsystem |
| File JSON persistence | `persistence/file/store-utils.ts` | Reuse | Suitable for small paired-device store and avoids immediate Prisma migration | N/A |
| Server settings UI | Settings > Nodes/Server | Extend | Natural product surface for Phone Access | N/A |
| Server route auth | None found | Create New | No current app-wide auth owner | Existing gateway signature auth is specific to external channel callbacks |
| Mobile static serving | None in server | Create New | Server does not serve Nuxt assets today | Existing workspace static routes serve workspace files only |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Remote Access | pairing sessions, settings, paired devices, auth verification, route policy, address candidates, client-facing URL resolver | DS-MRA-001..005, DS-MRA-007, DS-MRA-009, DS-MRA-010, DS-MRA-013 | PairingService, SettingsService, DeviceService, AuthService, RoutePolicy, ClientFacingUrlResolver | Create New | Lives in `autobyteus-server-ts/src/remote-access` plus API route/security files. |
| Mobile Web Access | mobile first-run, credential storage, auth transports, reconnect, connection diagnostics, mobile feature gates | DS-MRA-002..004, DS-MRA-006, DS-MRA-011, DS-MRA-012, RS-MRA-001..005 | MobilePairingBootstrap, MobileNodeSessionStore, MobileConnectionDiagnostics, MobileFeatureGates | Create New/Extend web | Lives in `autobyteus-web` stores/utils/components. |
| Node Context | active node endpoint binding | DS-MRA-002..004, DS-MRA-011 | WindowNodeContextStore | Extend | No parallel endpoint store. |
| Desktop Settings / Nodes | Phone Access surface, QR, settings, candidate selection, device management, revoke-all | DS-MRA-001, DS-MRA-005, DS-MRA-009, DS-MRA-010, DS-MRA-013 | PhoneAccessStore/UI | Extend | Use existing settings section. |
| Packaging / Build | mobile Nuxt output and server asset copy | DS-MRA-006 | Mobile Web Static Host | Extend | Add mobile-web build target and copy into server resources. |
| Client-Facing URL | remote-safe URL composition | DS-MRA-007 | ClientFacingUrlResolver | Create/Extend | Server resolver plus frontend bound-node URL/blob helpers. |
| Validation / Docs | Tailscale first validation and VPN-agnostic guides | DS-MRA-008, DS-MRA-014 | Validation Profile, Documentation Profile | Extend docs/tests | Tailscale is profile, not dependency. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | Server Remote Access | Domain models | Pairing payload, device, settings, auth context, route classification, failure-code types | One domain vocabulary | N/A |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Server Remote Access | Pairing Service | Create/exchange/expire pairing sessions | Pairing lifecycle one owner | models, settings service, device service |
| `autobyteus-server-ts/src/remote-access/services/remote-access-settings-service.ts` | Server Remote Access | Settings Service | Enable/disable Phone Access and invalidate auth/pairing state | Global feature state one owner | settings store, models |
| `autobyteus-server-ts/src/remote-access/stores/remote-access-settings-store.ts` | Server Remote Access | Persistence | Locked JSON store for Phone Access settings | Isolate persistence | store-utils |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Server Remote Access | Device Service | List/revoke/revoke-all/create device records and projections | Durable device lifecycle one owner | models/store |
| `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` | Server Remote Access | Persistence | Locked JSON store of hashed device credentials | Isolate persistence | store-utils |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Server Remote Access | Auth Service | Verify bearer/query credentials, settings state, revocation, loopback context | Auth invariant one owner | device/settings services |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Server Remote Access | Address Candidate Service | List URL candidates from interfaces/manual input | Provider-agnostic discovery | models |
| `autobyteus-server-ts/src/remote-access/services/client-facing-url-resolver.ts` | Client-Facing URL | URL Resolver | Root-relative and client-facing URL composition | Prevents loopback URL leakage | auth context/settings/config |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Server Remote Access API | REST facade | Pairing/status/settings/devices/revoke-all endpoints | Transport only | services |
| `autobyteus-server-ts/src/api/security/remote-access-local-trust.ts` | API security | Local trust helper | Peer-socket loopback normalization/predicate | Keeps local trust testable and header-independent | route policy |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | API security | Route Policy | Public/local/mobile/external/default route classification and HTTP auth decisions | Central policy | AuthService, local trust |
| `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` | API security | Fastify plugin | Register hooks/decorations before routes | Encapsulates Fastify integration | route policy |
| `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts` | API security/logging | Redaction helper | Mask auth/pairing tokens in URLs | One logging safety owner | log policy, WS auth |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | API WebSocket | WS auth adapter | Query-token extraction, auth, close-code mapping | Browser WS special case | AuthService, route policy |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | Mobile Web Static Host | Static host | Serve `/mobile` assets and SPA fallback | Static serving only | `@fastify/static` |
| `autobyteus-web/stores/phoneAccessStore.ts` | Desktop Settings | Phone Access Store | Load settings, toggle enable, generate QR, list/revoke/revoke-all devices, candidate selection | Desktop UI orchestration | API client/shared types |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Desktop Settings | Phone Access UI | User-facing setup/settings/device/status card | One visual surface | store |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | Mobile Web Access | Mobile Node Session | Persist paired node credential, reconnect, bind node context, auth state | Mobile runtime session one owner | endpoint utils, diagnostics |
| `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts` | Mobile Web Access | Credential storage adapter | PWA localStorage now, native secure storage later seam | Storage one concern | types |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Mobile Web Access | Auth transport | REST/Apollo/fetch token injection and error mapping | Avoid duplicate auth plumbing | session store, diagnostics |
| `autobyteus-web/utils/remoteAccess/websocketAuth.ts` | Mobile Web Access | WS auth URL helper | Append `access_token` query param using MVP policy | Keeps query-token construction centralized | session store |
| `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts` | Mobile Web Access | Diagnostics mapper | Map network/auth/WebSocket/unsupported errors to recovery states | One user-actionable failure model | authorized transport, session store |
| `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` | Mobile Web Access | Mobile bootstrap UI | First-run QR/import/manual pairing | One flow UI | session store |
| `autobyteus-web/pages/mobile.vue` or route group | Mobile Web Access | Mobile shell entry | Mobile-only app entry / routing | Keeps desktop shell separate when needed | components |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile Web Access | Feature gates | Runtime mobile capability classification | Prevents Electron-only leakage | N/A |
| `autobyteus-web/scripts/build-mobile-web.mjs` | Packaging | Build helper | Generate mobile Nuxt static output | Build step isolated | Nuxt config |
| `autobyteus-web/scripts/prepare-server.*` | Packaging | Resource copy | Copy mobile assets into server bundle | Existing server packaging owner | build output |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Pairing payload shape | `remote-access/domain/models.ts` and web type mirror/generated type | Server Remote Access | Used by QR composer and mobile exchange | Yes | Yes | Generic node config blob |
| Device summary/record shape | `remote-access/domain/models.ts` | Server Remote Access | Used by list/revoke/revoke-all UI and auth service | Yes | Yes | Mixed credential + display object exposing secret |
| Phone Access settings shape | `remote-access/domain/models.ts` | Server Remote Access | Used by settings API, pairing service, auth service, and UI | Yes | Yes | Boolean scattered across UI/store/auth |
| Route classification values | `remote-access/domain/models.ts` or `api/security/remote-access-route-policy.ts` exported type | Server Remote Access | HTTP/GraphQL/WS policy and tests share exact classification vocabulary | Yes | Yes | Route-local string literals |
| WebSocket auth token policy | `utils/remoteAccess/websocketAuth.ts` + `api/websocket/remote-access-websocket-auth.ts` | Mobile/Server Remote Access | Client/server must agree on query key, close codes, and redaction | Yes | Yes | Query/subprotocol fork |
| URL candidate shape | `remote-access/domain/models.ts` | Server Remote Access | Used by Phone Access UI and QR selection | Yes | Yes | VPN-specific model |
| Client-facing URL context | `client-facing-url-resolver.ts` / domain type | Client-Facing URL | URL producers need the same remote-safe fallback order | Yes | Yes | Each service deriving from config/Host independently |
| Auth failure / diagnostics model | `remote-access/domain/models.ts` + `web/utils/remoteAccess/mobileConnectionDiagnostics.ts` | Server/Mobile Remote Access | Consistent error handling for HTTP/GraphQL/WS | Yes | Yes | Catch-all error string only |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `RemoteAccessPairingPayload` | Yes | Yes | Medium | Include `serverBaseUrl`, `pairingCode`, `expiresAt`, `serverName`; no long-lived token. |
| `PairedDeviceRecord` | Yes | Yes | Low | Store `deviceId`, `displayName`, `credentialHash`, `clientFacingBaseUrl`, `createdAt`, `lastSeenAt`, `revokedAt`; never store plaintext token. |
| `RemoteAccessSettings` | Yes | Yes | Low | Store `phoneAccessEnabled`, `updatedAt`, optional source; do not overload device records to represent disabled state. |
| `RemoteAccessAuthContext` | Yes | Yes | Low | Include `mode: loopback/mobile`, `deviceId?`, `isAuthenticated`, `clientFacingBaseUrl?`; avoid raw token. |
| `RemoteAccessRouteClassification` | Yes | Yes | Low | Explicit values: `PUBLIC_STATIC`, `PUBLIC_HEALTH`, `PUBLIC_HEALTH_STATUS`, `PUBLIC_PREFLIGHT`, `PUBLIC_PAIRING_EXCHANGE`, `LOCAL_ONLY`, `LOCAL_DEV_ONLY`, `LOCAL_OR_MOBILE`, `LOCAL_OR_MOBILE_WS`, `EXTERNAL_SIGNATURE`, `DEFAULT_PROTECTED`. |
| `WebSocketAuthPolicy` | Yes | Yes | Low | One MVP value: `WEBSOCKET_AUTH_QUERY_TOKEN` with query key `access_token`; no subprotocol alternative in MVP. |
| `RemoteAccessUrlCandidate` | Yes | Yes | Medium | Use provider-agnostic `kind: lan|tailnet_like|manual|loopback`; no Tailscale-specific API fields. |
| `ClientFacingUrlContext` | Yes | Yes | Medium | Request/auth/config inputs only; no Host/Origin/forwarded-header trust. |
| `MobileNodeSession` | Yes | Yes | Medium | Keep credential separate from generic `NodeProfile` to avoid leaking tokens into node registry. |
| `MobileConnectionFailureKind` | Yes | Yes | Low | Values distinguish network, auth-required, revoked, disabled, WebSocket blocked, unsupported feature, and version incompatibility. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | Server Remote Access | Domain models | Pairing payload, device, settings, auth context, route classification, failure-code types | One domain vocabulary | N/A |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Server Remote Access | Pairing Service | Create/exchange/expire pairing sessions | Pairing lifecycle one owner | models, settings service, device service |
| `autobyteus-server-ts/src/remote-access/services/remote-access-settings-service.ts` | Server Remote Access | Settings Service | Enable/disable Phone Access and invalidate auth/pairing state | Global feature state one owner | settings store, models |
| `autobyteus-server-ts/src/remote-access/stores/remote-access-settings-store.ts` | Server Remote Access | Persistence | Locked JSON store for Phone Access settings | Isolate persistence | store-utils |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | Server Remote Access | Device Service | List/revoke/revoke-all/create device records and projections | Durable device lifecycle one owner | models/store |
| `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` | Server Remote Access | Persistence | Locked JSON store of hashed device credentials | Isolate persistence | store-utils |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | Server Remote Access | Auth Service | Verify bearer/query credentials, settings state, revocation, loopback context | Auth invariant one owner | device/settings services |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Server Remote Access | Address Candidate Service | List URL candidates from interfaces/manual input | Provider-agnostic discovery | models |
| `autobyteus-server-ts/src/remote-access/services/client-facing-url-resolver.ts` | Client-Facing URL | URL Resolver | Root-relative and client-facing URL composition | Prevents loopback URL leakage | auth context/settings/config |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | Server Remote Access API | REST facade | Pairing/status/settings/devices/revoke-all endpoints | Transport only | services |
| `autobyteus-server-ts/src/api/security/remote-access-local-trust.ts` | API security | Local trust helper | Peer-socket loopback normalization/predicate | Keeps local trust testable and header-independent | route policy |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | API security | Route Policy | Public/local/mobile/external/default route classification and HTTP auth decisions | Central policy | AuthService, local trust |
| `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` | API security | Fastify plugin | Register hooks/decorations before routes | Encapsulates Fastify integration | route policy |
| `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts` | API security/logging | Redaction helper | Mask auth/pairing tokens in URLs | One logging safety owner | log policy, WS auth |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | API WebSocket | WS auth adapter | Query-token extraction, auth, close-code mapping | Browser WS special case | AuthService, route policy |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | Mobile Web Static Host | Static host | Serve `/mobile` assets and SPA fallback | Static serving only | `@fastify/static` |
| `autobyteus-web/stores/phoneAccessStore.ts` | Desktop Settings | Phone Access Store | Load settings, toggle enable, generate QR, list/revoke/revoke-all devices, candidate selection | Desktop UI orchestration | API client/shared types |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Desktop Settings | Phone Access UI | User-facing setup/settings/device/status card | One visual surface | store |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | Mobile Web Access | Mobile Node Session | Persist paired node credential, reconnect, bind node context, auth state | Mobile runtime session one owner | endpoint utils, diagnostics |
| `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts` | Mobile Web Access | Credential storage adapter | PWA localStorage now, native secure storage later seam | Storage one concern | types |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | Mobile Web Access | Auth transport | REST/Apollo/fetch token injection and error mapping | Avoid duplicate auth plumbing | session store, diagnostics |
| `autobyteus-web/utils/remoteAccess/websocketAuth.ts` | Mobile Web Access | WS auth URL helper | Append `access_token` query param using MVP policy | Keeps query-token construction centralized | session store |
| `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts` | Mobile Web Access | Diagnostics mapper | Map network/auth/WebSocket/unsupported errors to recovery states | One user-actionable failure model | authorized transport, session store |
| `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` | Mobile Web Access | Mobile bootstrap UI | First-run QR/import/manual pairing | One flow UI | session store |
| `autobyteus-web/pages/mobile.vue` or route group | Mobile Web Access | Mobile shell entry | Mobile-only app entry / routing | Keeps desktop shell separate when needed | components |
| `autobyteus-web/utils/mobileFeatureGates.ts` | Mobile Web Access | Feature gates | Runtime mobile capability classification | Prevents Electron-only leakage | N/A |
| `autobyteus-web/scripts/build-mobile-web.mjs` | Packaging | Build helper | Generate mobile Nuxt static output | Build step isolated | Nuxt config |
| `autobyteus-web/scripts/prepare-server.*` | Packaging | Resource copy | Copy mobile assets into server bundle | Existing server packaging owner | build output |

## Ownership Boundaries

- Server Remote Access is the authoritative owner for pairing, credentials, request authentication, and device revocation. Route handlers must not implement their own mobile auth rules.
- Frontend Mobile Web Access is the authoritative owner for phone credential storage and auth propagation. Feature stores must not read localStorage tokens directly.
- `windowNodeContextStore` remains the authoritative owner for the active node base URL and derived endpoints. Mobile session code binds it; individual stores do not derive endpoints independently.
- Private network providers are outside AutoByteus core. Setup docs and validation profiles may mention Tailscale/Headscale/company VPN, but core pairing/auth works with any reachable URL.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `RemoteAccessAuthService` | token normalization/hash verification/device lookup/settings check/local trust/auth context | Route policy, WS auth adapter | Route handler directly checking tokens or enabled state | Add method to AuthService |
| `RemoteAccessRoutePolicy` | route classification table and HTTP/GraphQL auth-required decisions | Fastify hooks, server runtime | Each route choosing auth independently | Extend policy map |
| `remote-access-local-trust.ts` | peer-socket loopback parsing and IPv4/IPv6 normalization | AuthService, RoutePolicy, WS auth adapter | Trusting `Host`, `Origin`, or forwarded headers | Add explicit trusted-proxy design later |
| `RemoteAccessSettingsService` | persisted `phoneAccessEnabled` state and cache invalidation trigger | Pairing service, AuthService, REST facade, PhoneAccessStore | UI-only disabled flag or device-record overloading | Add service command/query |
| `PairedDeviceService` | store, revoke, revoke-all, last-seen, projections | API routes, AuthService | UI/API writing device store directly | Add service command/query |
| `ClientFacingUrlResolver` | root-relative path conversion and client-facing base fallback order | Upload/media/context/application URL producers | URL producers using `appConfigProvider.config.getBaseUrl()` directly for mobile responses | Add resolver method/context type |
| `MobileNodeSessionStore` | credential persistence, reconnect state, node binding | Mobile bootstrap, transports | Store reading token from localStorage | Add session store getter/action |
| `AuthorizedTransport` | HTTP bearer token composition and error mapping | Axios/Apollo/fetch callers | Components adding Authorization manually | Add transport helper |
| `websocketAuth.ts` / `remote-access-websocket-auth.ts` | WebSocket `access_token` query policy, server extraction, close-code mapping | WebSocket clients/routes | Direct query manipulation in components or stream handlers | Add helper contract |
| `MobileConnectionDiagnostics` | network/auth/WebSocket/unsupported failure normalization | Mobile session, bootstrap, shell | UI components branching on raw status/close codes | Add failure-kind mapping |
| `WindowNodeContextStore` | node base URL and endpoint derivation | API clients, mobile session | Re-deriving endpoint URLs from runtime config | Extend endpoint utility/context API |

## Dependency Rules

Allowed:

- Server runtime may register Remote Access policy plugin before REST/GraphQL/WebSocket routes.
- REST/GraphQL/WebSocket transport facades may depend on Remote Access services only for auth/management boundaries.
- Existing domain handlers remain unaware of mobile credential details after auth passes.
- Mobile session store may bind `windowNodeContextStore`.
- Authorized transports may read credential from mobile session store.
- Phone Access UI/store may call Remote Access management APIs.
- URL-producing services may call `ClientFacingUrlResolver` with request/auth context when returning client-visible file/media/context URLs.

Forbidden:

- No core code may call Tailscale-specific APIs to decide whether Remote Access works.
- No route handler may parse mobile access tokens directly.
- No frontend feature store may read/write the raw mobile credential outside the credential storage/session owner.
- No mobile-supported flow may use Electron `window.electronAPI`.
- No mobile-supported flow may depend on global `getServerUrls()` if a bound node endpoint is available.
- No server-generated mobile URL may be loopback-only unless the request is loopback-local.
- No local trust decision may use `Host`, `Origin`, `Forwarded`, `X-Forwarded-For`, or `X-Real-IP`.
- No mobile-supported WebSocket caller may append `access_token` outside `websocketAuth.ts` / `AuthorizedTransport`.
- No URL producer in the mobile-supported slice may call `appConfigProvider.config.getBaseUrl()` directly for a client-visible URL.
- No remote client may access GraphiQL/IDE, even with a valid mobile credential.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Policy / Notes |
| --- | --- | --- | --- | --- |
| `POST /rest/remote-access/pairing-sessions` | Pairing Session | Create QR pairing session | loopback-local peer socket; selected `serverBaseUrl`; optional device label hint | `LOCAL_ONLY`; disabled Phone Access returns `PHONE_ACCESS_DISABLED`; not remotely unauthenticated. |
| `POST /rest/remote-access/pairing-exchanges` | Pairing Session -> Paired Device | Exchange one-time code for credential | `pairingCode`, client device name, chosen `serverBaseUrl` from payload | `PUBLIC_PAIRING_EXCHANGE`; code-protected; one-time/expiry; disabled Phone Access rejects. |
| `GET /rest/remote-access/status` | Remote Access status | Return safe public status | no identity | `PUBLIC_HEALTH_STATUS`; returns only non-sensitive `phoneAccessEnabled`, `pairingAvailable`, and server version/compatibility. |
| `GET /rest/remote-access/address-candidates` | Address candidates | Return LAN/tailnet/manual URL candidates | loopback-local peer socket | `LOCAL_ONLY`; candidates can expose local network details and must not be public. |
| `GET /rest/remote-access/devices` | Paired Devices | List paired devices | loopback-local desktop management | `LOCAL_ONLY`; projection excludes credential hashes. |
| `DELETE /rest/remote-access/devices/:deviceId` | Paired Device | Revoke one device | loopback-local desktop management + `deviceId` | `LOCAL_ONLY`; permanent credential invalidation. |
| `DELETE /rest/remote-access/devices` | Paired Devices | Revoke all paired phones | loopback-local desktop management | `LOCAL_ONLY`; invalidates every credential and leaves Phone Access enable state unchanged. |
| `GET /rest/remote-access/settings` | Phone Access settings | Read enabled/disabled state and safe settings | loopback-local desktop management | `LOCAL_ONLY`; used by Settings > Phone Access. |
| `PUT /rest/remote-access/settings` | Phone Access settings | Enable/disable Phone Access and persist settings | loopback-local desktop management + `{ phoneAccessEnabled: boolean }` | `LOCAL_ONLY`; disabling blocks pairing and mobile auth without deleting devices. |
| `Authorization: Bearer <token>` | Mobile credential | HTTP REST/GraphQL auth | opaque credential token | Server hashes/compares; never logs plaintext; route policy converts to `RemoteAccessAuthContext`. |
| `?access_token=<token>` | Mobile credential | Browser WebSocket auth | opaque credential token in the WebSocket URL query string | Chosen MVP policy `WEBSOCKET_AUTH_QUERY_TOKEN`; redaction is mandatory before any URL logging. |
| `MobileNodeSessionStore.pairWithPayload(payload)` | Mobile session | Exchange QR/manual payload and bind node | pairing payload | Frontend first-run owner; stores credential in mobile credential adapter, not `NodeProfile`. |
| `AuthorizedTransport.buildWebSocketUrl(endpoint, credential)` | WebSocket transport | Add query-token auth using the approved mechanism | endpoint + active credential | Only helper allowed to append `access_token`; preserves existing query params and masks token in diagnostics. |
| `ClientFacingUrlResolver.resolveRestResourceUrl(input)` | Client-facing URL | Produce remote-safe REST resource URLs | request/auth context + REST path + preference | Prefer root-relative `/rest/...`; never use `Host`, `Origin`, or forwarded headers for trust decisions. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Pairing session create | Yes | Yes | Low | Keep peer-socket loopback predicate explicit. |
| Pairing exchange | Yes | Yes | Low | Do not combine with manual node add; disabled state rejects exchange. |
| Device list/revoke/revoke-all | Yes | Yes | Low | Keep credential secret out of projection; revoke-all is a service command. |
| Phone Access settings | Yes | Yes | Low | Persist enabled flag separately from device records. |
| HTTP auth header | Yes | Yes | Low | Standard bearer token. |
| WebSocket query token | Yes | Yes | Medium | Use only `access_token` query key and mandatory redaction helpers. |
| Mobile session storage | Yes | Yes | Medium | Keep token separate from node profile. |
| Client-facing URL resolver | Yes | Yes | Low | Centralize current server URL producers through resolver or root-relative paths. |

## RemoteAccessRoutePolicy And Local Trust Semantics

`RemoteAccessRoutePolicy` is the single HTTP/GraphQL route policy owner. It classifies every incoming HTTP request by method and path before the existing handler executes. WebSocket route registration uses the same classification model through `remote-access-websocket-auth.ts` before attaching the existing stream handlers.

### Local trust predicate

Local desktop trust is based only on the peer socket address from Fastify/Node, not on request headers:

- HTTP requests use `request.raw.socket.remoteAddress`.
- WebSocket upgrades use the upgrade request socket address exposed to the route handler.
- Accepted loopback peers are:
  - IPv4 `127.0.0.0/8`, including but not limited to `127.0.0.1`.
  - IPv6 `::1`.
  - IPv4-mapped IPv6 loopback such as `::ffff:127.0.0.1` and any `::ffff:127.x.x.x`.
- Missing, empty, or unparseable peer addresses are treated as non-local.
- `Host`, `Origin`, `Forwarded`, `X-Forwarded-For`, and `X-Real-IP` are ignored for local trust and auth classification. Proxy-aware deployment is out of scope for the MVP; a future reverse-proxy mode must add an explicit trusted-proxy configuration instead of silently trusting forwarded headers.

Target helper files:

- `autobyteus-server-ts/src/api/security/remote-access-local-trust.ts`
  - `normalizePeerAddress(address: string | undefined): NormalizedPeerAddress | null`
  - `isLoopbackPeerAddress(address: string | undefined): boolean`
  - Unit tests cover `127.0.0.1`, `127.2.3.4`, `::1`, `::ffff:127.0.0.1`, non-loopback LAN/tailnet addresses, missing input, and malformed input.
- `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts`
  - `classifyHttpRoute(method: string, path: string): RemoteAccessRouteClassification`
  - `authorizeHttpRequest(request): Promise<RemoteAccessAuthContext | RemoteAccessRejection>`

### Route classification table

| Route / Route Family | Classification | Non-loopback Mobile Requirement | Loopback Desktop Requirement | Notes |
| --- | --- | --- | --- | --- |
| `GET /mobile`, `GET /mobile/*`, mobile manifest/service-worker/assets under `/mobile/*` | `PUBLIC_STATIC` | No credential | Allowed | Static assets only; no secrets in generated assets. |
| `GET /rest/health` | `PUBLIC_HEALTH` | No credential | Allowed | Must return only safe liveness data. |
| `GET /rest/remote-access/status` | `PUBLIC_HEALTH_STATUS` | No credential | Allowed | Safe summary only: enabled/disabled, pairing availability, compatibility; no address list/device list. |
| `GET /rest/remote-access/address-candidates` | `LOCAL_ONLY` | Rejected | Loopback peer required | Exposes LAN/tailnet/manual candidates only to desktop settings. |
| `POST /rest/remote-access/pairing-sessions` | `LOCAL_ONLY` | Rejected | Loopback peer required | Creates QR/session only when Phone Access is enabled. |
| `POST /rest/remote-access/pairing-exchanges` | `PUBLIC_PAIRING_EXCHANGE` | Valid unexpired one-time pairing code | Allowed with valid code | No bearer credential yet; disabled Phone Access rejects. |
| `GET /rest/remote-access/devices` | `LOCAL_ONLY` | Rejected | Loopback peer required | Desktop management only. |
| `DELETE /rest/remote-access/devices/:deviceId` | `LOCAL_ONLY` | Rejected | Loopback peer required | Per-device revoke. |
| `DELETE /rest/remote-access/devices` | `LOCAL_ONLY` | Rejected | Loopback peer required | Revoke-all paired phones. |
| `GET /rest/remote-access/settings`, `PUT /rest/remote-access/settings` | `LOCAL_ONLY` | Rejected | Loopback peer required | Enable/disable Phone Access. |
| `POST /graphql` JSON GraphQL operations | `LOCAL_OR_MOBILE` | `Authorization: Bearer` valid paired credential and Phone Access enabled | Loopback peer allowed | Resolver code remains unaware of transport credential. |
| `OPTIONS /graphql` | `PUBLIC_PREFLIGHT` | No credential | Allowed | CORS preflight only; no data. |
| GraphiQL HTML / IDE response at `/graphql` | `LOCAL_DEV_ONLY` | Rejected even with mobile token | Loopback allowed only in development/test profile | If framework cannot distinguish GraphiQL reliably, disable GraphiQL when remote access feature is enabled/production packaged. |
| GraphQL subscriptions over `/graphql` WebSocket | `LOCAL_OR_MOBILE_WS` | `access_token` query credential valid and Phone Access enabled | Loopback peer allowed | Uses `remote-access-websocket-auth.ts` before subscription attach. |
| `/ws/agent`, `/ws/agent-team`, `/ws/terminal`, `/ws/file-explorer` | `LOCAL_OR_MOBILE_WS` | `access_token` query credential valid and Phone Access enabled | Loopback peer allowed | Existing stream handlers run only after auth context is accepted. |
| `/ws/applications/:applicationId/backend/notifications` | `LOCAL_OR_MOBILE_WS` | `access_token` query credential valid and Phone Access enabled | Loopback peer allowed | Application notification stream. |
| `POST /rest/api/channel-ingress/v1/messages`, `POST /rest/api/channel-ingress/v1/delivery-events` | `EXTERNAL_SIGNATURE` | Existing channel gateway signature/shared-secret policy; mobile credential is not accepted | Existing current behavior only if route already allows it | Remote Access does not own or weaken external gateway auth. If `CHANNEL_GATEWAY_SHARED_SECRET` is unset today, implementation must preserve the existing route semantics but must not treat mobile tokens as a substitute. |
| `/rest/applications/:applicationId/backend/**` | `LOCAL_OR_MOBILE` | Bearer credential valid and Phone Access enabled | Loopback peer allowed | Application backend routes are protected before application handlers. |
| `/rest/application-bundles/:applicationId/assets/**` | `LOCAL_OR_MOBILE` for MVP mobile use | Bearer credential or authorized fetch/blob helper | Loopback peer allowed | Direct unauthenticated iframe/asset loading is out of MVP unless a signed/authorized asset fetch design is added. |
| `/rest/files/**`, `/rest/media/**`, `/rest/upload-file` | `LOCAL_OR_MOBILE` | Bearer credential valid and Phone Access enabled | Loopback peer allowed | Direct media previews on mobile use authorized fetch/blob helpers or root-relative same-origin URLs with the same bearer transport. |
| `/rest/workspaces/**`, `/rest/context-files/**`, `/rest/run-file-changes/**`, `/rest/team-communication/**` | `LOCAL_OR_MOBILE` | Bearer credential valid and Phone Access enabled | Loopback peer allowed | Covers file/workspace/context routes used by selected mobile slice. |
| Any future `/rest/**`, `/graphql`, or `/ws/**` route not explicitly classified | `DEFAULT_PROTECTED` | Bearer/query credential valid and Phone Access enabled, or rejected if unsupported transport | Loopback peer allowed | New routes are protected by default; public routes require explicit classification. |

### Route policy validation obligations

Implementation must add automated tests for these cases before API/E2E validation proceeds:

1. Non-loopback HTTP request to a protected REST route without bearer token is rejected.
2. Non-loopback GraphQL `POST /graphql` without bearer token is rejected.
3. Loopback requests from `127.0.0.1`, another `127/8` address, `::1`, and IPv4-mapped loopback are accepted where route classification allows local trust.
4. Non-loopback request with `Host: 127.0.0.1`, `Origin: http://127.0.0.1:29695`, or `X-Forwarded-For: 127.0.0.1` is still non-local and rejected without a valid credential.
5. GraphiQL HTML/IDE is not reachable from a non-loopback peer even if a mobile credential is supplied.
6. Channel ingress callbacks remain governed by their existing external signature/shared-secret route policy, not by Remote Access mobile credentials.
7. An intentionally unclassified new route fixture falls into `DEFAULT_PROTECTED`.

## WebSocket Auth MVP Policy

The MVP chooses query-parameter token transport because browser WebSocket cannot set arbitrary headers and query composition is simpler and more portable than subprotocol negotiation for the existing clients.

- Named policy value: `WEBSOCKET_AUTH_QUERY_TOKEN`.
- Credential query key: exactly `access_token`.
- Client helper: `autobyteus-web/utils/remoteAccess/websocketAuth.ts`
  - `buildAuthenticatedWebSocketUrl(endpoint: string, credential: string): string`
  - Preserves existing query parameters, appends/replaces only `access_token`, and never logs the returned URL without redaction.
  - Called only by `AuthorizedTransport`; direct `new WebSocket(endpoint)` remains allowed only for loopback desktop code paths or explicitly unauthenticated public sockets, none of which are in MVP mobile scope.
- Server helper: `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts`
  - `extractRemoteAccessWebSocketCredential(request): string | null` reads `access_token` from the parsed upgrade URL.
  - `authorizeRemoteAccessWebSocket(request, routeClass): Promise<RemoteAccessAuthContext>` allows loopback local peers without token, otherwise validates credential through `RemoteAccessAuthService` and rejects if Phone Access is disabled or the device is revoked.
- Close/error mapping:
  - Missing credential on protected non-loopback socket: close code `4401`, reason `REMOTE_ACCESS_AUTH_REQUIRED`.
  - Invalid/expired malformed credential: close code `4401`, reason `REMOTE_ACCESS_AUTH_INVALID`.
  - Revoked device: close code `4403`, reason `REMOTE_ACCESS_DEVICE_REVOKED`.
  - Phone Access disabled: close code `4403`, reason `PHONE_ACCESS_DISABLED`.
  - Unsupported mobile socket route: close code `4404`, reason `REMOTE_ACCESS_ROUTE_UNSUPPORTED`.
- Rejection rule: existing stream handlers must not be called after an auth rejection.
- Log redaction:
  - Add `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts` with `redactSensitiveUrl(url: string): string`.
  - Redact query keys `access_token`, `token`, `auth`, `authorization`, `code`, and `pairingCode`.
  - Update `autobyteus-server-ts/src/logging/http-access-log-policy.ts` to log redacted URLs instead of `request.url`.
  - WebSocket connection/rejection logs must call the same helper before logging a URL.
  - Add tests proving `?access_token=secret` and mixed-case sensitive keys are masked while path and non-sensitive query keys remain useful.

## ClientFacingUrlResolver Concrete Design

`ClientFacingUrlResolver` is a server Remote Access off-spine owner for URLs returned to clients. It prevents Electron loopback defaults from leaking into mobile responses and gives future external-base/HTTPS work one boundary.

Target file:

- `autobyteus-server-ts/src/remote-access/services/client-facing-url-resolver.ts`

Target types, either in `remote-access/domain/models.ts` or a colocated `client-facing-url-types.ts` if the file grows:

```ts
export type ClientFacingUrlContext = {
  request?: FastifyRequest;
  authContext?: RemoteAccessAuthContext | null;
  pairedDeviceClientBaseUrl?: string | null;
  configuredExternalBaseUrl?: string | null;
  localFallbackBaseUrl: string;
};

export type ResolveRestResourceUrlInput = {
  context: ClientFacingUrlContext;
  restPath: string; // e.g. "/rest/files/images/a.png"
  prefer?: "relative" | "absolute";
};

export interface ClientFacingUrlResolver {
  resolveClientFacingBaseUrl(context: ClientFacingUrlContext): string | null;
  resolveRestResourceUrl(input: ResolveRestResourceUrlInput): string;
  toRestRelativePath(pathOrUrl: string): string;
}
```

Base URL policy:

1. Prefer transport-neutral root-relative `/rest/...` URLs for same-origin mobile/PWA responses and persisted resource references. This avoids relying on `Host` and prevents loopback leakage.
2. When an absolute URL is required for a mobile-authenticated request, use the paired device/session `clientFacingBaseUrl` captured from the pairing payload's selected `serverBaseUrl` and attached to `RemoteAccessAuthContext`.
3. If no paired-device base is available, use an explicit configured Phone Access/external base URL from settings.
4. If the request is loopback-local or no remote context exists, use `appConfigProvider.config.getBaseUrl()` as the local desktop fallback.
5. Never derive auth, local trust, or preferred remote base from `Host`, `Origin`, `Forwarded`, `X-Forwarded-For`, or `X-Real-IP` headers. Header values may appear in diagnostics only as untrusted observations if explicitly labeled.

Pairing/device integration:

- `RemoteAccessPairingPayload.serverBaseUrl` is the desktop-selected URL that the phone will use for initial contact.
- On successful pairing exchange, `PairedDeviceRecord` stores `clientFacingBaseUrl` equal to the normalized `serverBaseUrl` used for pairing.
- `RemoteAccessAuthContext` includes `clientFacingBaseUrl?: string` for mobile-authenticated requests. Loopback-local contexts do not need it.

MVP URL producers to migrate:

| Current Producer | Current Risk | MVP Resolver Action |
| --- | --- | --- |
| `autobyteus-server-ts/src/api/rest/upload-file.ts` | Returns `${appConfigProvider.config.getBaseUrl()}/rest/files/...`, which is loopback in Electron. | Return root-relative `/rest/files/...` for mobile-compatible response or call `resolveRestResourceUrl({ prefer: "relative" })`. |
| `autobyteus-server-ts/src/services/media-storage-service.ts#listMediaFiles` | Builds absolute media URLs from config base URL. | Accept a `ClientFacingUrlContext` or resolver option from the route/service caller and return root-relative/mobile-safe URLs in mobile slice. |
| `autobyteus-server-ts/src/services/media-storage-service.ts#ingestLocalFileForContext` | Persists/returns absolute loopback URL for context file. | Store/return a root-relative `/rest/files/...` where supported; only convert to absolute for loopback desktop if a legacy caller truly requires it. |
| `autobyteus-server-ts/src/services/media-storage-service.ts#storeMediaAndGetUrl` | Same loopback absolute URL risk. | Use resolver/root-relative policy for mobile-supported media flows. |
| `autobyteus-web/utils/contextFiles/contextAttachmentPresentation.ts` | Can use global `getServerUrls()` instead of bound node endpoints. | Mobile-supported preview resolves root-relative paths against `windowNodeContextStore` endpoints and uses AuthorizedTransport fetch/blob helpers. |
| Application bundle/backend asset URLs | Direct iframe/asset fetch may not carry bearer auth. | Out of MVP for direct mobile rendering unless routed through authorized fetch/blob or signed asset URL design; route remains protected. |

Validation obligations:

- A non-loopback paired mobile request to upload/media list/context file flows must not receive `127.0.0.1`, `localhost`, or `[::1]` as the only usable URL.
- Root-relative URLs returned from server must resolve against the paired node base via `windowNodeContextStore` on mobile.
- Absolute mobile URLs, when explicitly required, must use the paired `clientFacingBaseUrl` and not the Electron embedded loopback base.
- Unit tests cover `toRestRelativePath()` normalization and resolver fallback order; API/E2E validation verifies generated URLs over the Tailscale profile.

## Phone Access Settings, Disable, And Revoke-All Design

R-MRA-074 through R-MRA-077 stay in scope for the first secure PWA MVP.

Target server files:

- `autobyteus-server-ts/src/remote-access/domain/models.ts`
  - `RemoteAccessSettings = { phoneAccessEnabled: boolean; updatedAt: string; updatedBy?: "loopback-desktop" }`
  - `PhoneAccessDisabledError`, `RemoteAccessAuthFailureCode` values including `PHONE_ACCESS_DISABLED` and `REMOTE_ACCESS_DEVICE_REVOKED`.
- `autobyteus-server-ts/src/remote-access/stores/remote-access-settings-store.ts`
  - Locked JSON persistence using existing `persistence/file/store-utils.ts`.
  - Default: `phoneAccessEnabled: false` for first install until user enables Phone Access.
- `autobyteus-server-ts/src/remote-access/services/remote-access-settings-service.ts`
  - `getSettings()`
  - `setPhoneAccessEnabled(enabled: boolean)`
  - Emits/returns state for Phone Access UI and invalidates auth cache when disabling.
- `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts`
  - Add `revokeAllDevices(now = clock.now()): Promise<{ revokedCount: number }>`.
  - Revoke-all sets `revokedAt` on every active device; it does not toggle `phoneAccessEnabled`.

Target REST/API behavior:

- `GET /rest/remote-access/settings`: loopback-only settings read.
- `PUT /rest/remote-access/settings`: loopback-only enable/disable.
- `DELETE /rest/remote-access/devices`: loopback-only revoke-all command.
- Pairing-session create/exchange checks `phoneAccessEnabled` before creating/exchanging.
- `RemoteAccessAuthService` rejects mobile credentials with `PHONE_ACCESS_DISABLED` when disabled, even if the device record is otherwise valid.
- Re-enabling Phone Access restores access for non-revoked paired devices; revoke-all is the permanent invalidation action.

Target frontend/UI behavior:

- `autobyteus-web/stores/phoneAccessStore.ts` owns settings load/save, QR create, device list, per-device revoke, and revoke-all command.
- `autobyteus-web/components/settings/PhoneAccessCard.vue` shows:
  - Enable Phone Access toggle.
  - Disabled explanation: phones cannot connect and QR creation is unavailable.
  - Paired-device list with per-device revoke.
  - Dangerous revoke-all action with confirmation and count/result.
- Mobile diagnostics maps disabled/revoked auth failures to “Phone Access is disabled on desktop” or “This phone was revoked; pair again.”

## Mobile Connection Diagnostics Mapping

AC-MRA-017 is owned by existing mobile access files rather than a separate subsystem:

- `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts`
  - Maps network failure, HTTP status, GraphQL auth error, and WebSocket close code into `MobileConnectionFailureKind = "network_unreachable" | "auth_required" | "device_revoked" | "phone_access_disabled" | "websocket_blocked" | "unsupported_mobile_feature" | "server_version_incompatible"`.
- `MobileNodeSessionStore` consumes this mapper on pairing/check/reconnect.
- `MobilePairingBootstrap.vue` and mobile shell render the resulting recovery action.

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Feature | Remote Access | Yes | Low | Use consistently for subsystem |
| Desktop UI | Phone Access | Yes | Low | User-facing label |
| Pairing one-time state | Pairing Session | Yes | Low | Do not call it a device token |
| Durable phone | Paired Device | Yes | Low | Do not mix with NodeProfile |
| Frontend active phone state | Mobile Node Session | Yes | Medium | Keep distinct from node registry |
| Network provider | Private Network Provider/Profile | Yes | Low | Avoid VPN-vendor coupling |

## Applied Patterns (If Any)

- Memory-only expiring registry: Pairing sessions live in memory with expiry checks/timer cleanup.
- File-backed durable stores: Paired devices and Phone Access settings use existing locked JSON store utilities; small device/settings state avoids premature DB expansion.
- Fastify route-policy plugin: Centralized policy owner for HTTP/GraphQL route access.
- Transport adapters: REST/Apollo/WebSocket auth propagation is an adapter around existing clients.
- Feature gates: Mobile capability gates prevent Electron-only flows from appearing in PWA.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/` | Folder | Server Remote Access | App-level pairing/auth/settings/device/url domain | New server capability area | REST handler details only |
| `autobyteus-server-ts/src/remote-access/domain/models.ts` | File | Domain | Remote Access types, classifications, failure codes | Shared by services | Transport framework logic except type-only imports where unavoidable |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | File | Pairing Service | Session creation/exchange/expiry | Main pairing owner | UI QR rendering |
| `autobyteus-server-ts/src/remote-access/services/remote-access-settings-service.ts` | File | Settings Service | Enable/disable Phone Access and cache invalidation signal | Global feature-state owner | Device credential storage |
| `autobyteus-server-ts/src/remote-access/stores/remote-access-settings-store.ts` | File | Settings Persistence | JSON persistence for Phone Access settings | Storage details isolated | Auth/pairing decisions |
| `autobyteus-server-ts/src/remote-access/services/paired-device-service.ts` | File | Device Service | Device lifecycle, per-device revoke, revoke-all, projections | Durable device owner | Token parsing from request |
| `autobyteus-server-ts/src/remote-access/stores/paired-device-store.ts` | File | Device Persistence | JSON persistence for hashed device records | Storage details isolated | Pairing exchange logic |
| `autobyteus-server-ts/src/remote-access/services/remote-access-auth-service.ts` | File | Auth Service | Credential verification, settings check, local trust context | Auth owner | Route allowlist table |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | File | Address Candidates | Private-network URL candidate list/manual normalization | Provider-agnostic discovery owner | Tailscale API dependency |
| `autobyteus-server-ts/src/remote-access/services/client-facing-url-resolver.ts` | File | Client-Facing URL | Root-relative and remote-safe URL composition | URL policy owner | Route auth decisions |
| `autobyteus-server-ts/src/api/rest/remote-access.ts` | File | REST facade | Pairing/status/settings/devices/revoke-all routes | Existing REST folder convention | Business logic |
| `autobyteus-server-ts/src/api/security/` | Folder | API security | Shared Fastify auth policy, local trust, redaction | Cross-route transport policy | Domain service internals |
| `autobyteus-server-ts/src/api/security/remote-access-local-trust.ts` | File | Local Trust | Peer-socket loopback predicate | Small testable security primitive | Host/header trust |
| `autobyteus-server-ts/src/api/security/remote-access-policy-plugin.ts` | File | Fastify plugin | Hook registration/decorations | Framework integration | Credential store direct access |
| `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` | File | Route Policy | Classify and authorize HTTP/GraphQL routes | Central policy | Token hashing details |
| `autobyteus-server-ts/src/api/security/redact-sensitive-url.ts` | File | Redaction | URL query sensitive-key masking | Shared logging safety | Route decisions |
| `autobyteus-server-ts/src/api/websocket/remote-access-websocket-auth.ts` | File | WS Auth Adapter | Query-token extraction/auth/close mapping | WS transport special case | Stream business logic |
| `autobyteus-server-ts/src/api/static/mobile-web.ts` | File | Mobile Web Static Host | Serve mobile generated assets | Static transport owner | Pairing/auth business logic |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | File | Phone Access UI | QR, candidates, enable toggle, devices, revoke-all | Settings component | Auth verification |
| `autobyteus-web/stores/phoneAccessStore.ts` | File | Phone Access Store | Desktop UI API orchestration | Existing Pinia pattern | Raw token persistence |
| `autobyteus-web/components/mobile/` | Folder | Mobile Web UI | Mobile bootstrap/shell components | Separates mobile-specific UI | Desktop Electron controls |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | File | Mobile Node Session | Persist paired node/credential, reconnect, bind context | Runtime owner | Endpoint derivation copy |
| `autobyteus-web/utils/remoteAccess/` | Folder | Mobile Access Utilities | Credential storage, authorized transport, WS auth, diagnostics | Reusable mobile transport concerns | UI component state |
| `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts` | File | Credential Storage | PWA/localStorage adapter and native seam | Storage owner | API transport logic |
| `autobyteus-web/utils/remoteAccess/authorizedTransport.ts` | File | Authorized Transport | REST/Apollo/fetch auth injection and error mapping | HTTP transport owner | UI branching |
| `autobyteus-web/utils/remoteAccess/websocketAuth.ts` | File | WS URL Helper | Append `access_token` query param | Query-token owner | Direct WebSocket creation side effects |
| `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts` | File | Diagnostics | Failure-kind mapping | User-actionable error owner | Raw token/logging |
| `autobyteus-web/utils/mobileFeatureGates.ts` | File | Mobile gating | Capability classification | Prevents Electron leakage | Network/provider logic |
| `autobyteus-web/pages/mobile.vue` | File | Mobile entry | PWA first route/shell | Clear route entry | Full desktop settings shell |
| `autobyteus-web/scripts/build-mobile-web.mjs` | File | Packaging | Generate mobile static build | Build owner | Server runtime logic |
| `autobyteus-web/scripts/prepare-server.*` | File | Packaging | Copy mobile assets into `resources/server/mobile-web` | Existing resource preparation | PWA business logic |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/remote-access/domain` | Main-Line Domain-Control | Yes | Low | Tight model vocabulary |
| `src/remote-access/services` | Main-Line Domain-Control | Yes | Medium | Keep pairing/device/auth in separate files by owner |
| `src/remote-access/stores` | Persistence-Provider | Yes | Low | Store details isolated |
| `src/api/security` | Transport | Yes | Medium | Auth policy transport integration only; no device lifecycle |
| `src/api/rest/remote-access.ts` | Transport | Yes | Low | Thin facade over services |
| `src/api/static` | Transport | Yes | Low | Static serving only |
| `autobyteus-web/components/mobile` | Main-Line UI | Yes | Medium | Only mobile-specific shell/bootstrap components |
| `autobyteus-web/utils/remoteAccess` | Off-Spine Concern | Yes | Medium | Transport/credential utilities only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| VPN-agnostic pairing payload | `{ serverBaseUrl: "http://100.x.y.z:29695", pairingCode: "...", expiresAt: "..." }` | `{ tailscaleDeviceId: "...", tailscaleApiToken: "..." }` | Keeps Tailscale as transport profile only |
| Auth propagation | `AuthorizedTransport.addAuth(requestConfig)` | Each store manually reading `localStorage.remoteAccessToken` | Prevents missing REST/GraphQL/WS auth |
| WebSocket URL | `buildAuthenticatedWebSocketUrl(endpoints.agentWs, token)` | `new WebSocket(endpoints.agentWs)` in mobile-supported flows | Ensures stream auth is not forgotten |
| Desktop QR creation | Loopback-only `POST /rest/remote-access/pairing-sessions` | Remotely unauthenticated QR creation | Prevents remote peers from minting pairing codes |
| URL resolution | Server returns transport-neutral path or client-facing URL from request context | Server returns `http://127.0.0.1:29695/rest/files/...` to phone | Prevents remote broken previews |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Native Android-only protocol | User asked whether Android first | Rejected | PWA/mobile web protocol first; Android wrapper later consumes same protocol |
| Tailscale-specific core SDK/API | Tailscale is easiest validation provider | Rejected | Provider-agnostic URL + pairing; Tailscale docs/test profile only |
| Per-route auth checks | Quick to patch one route | Rejected | Central RemoteAccessRoutePolicy |
| Store mobile credential inside generic NodeProfile | Node registry already exists | Rejected | Separate MobileNodeSession credential store; NodeProfile remains non-secret metadata |
| Keep mobile-supported global `getServerUrls()` paths | Existing helper works for desktop/dev | Rejected for mobile-supported flows | Replace with bound node endpoints |
| Leave GraphiQL remote-accessible in production | Existing GraphQL config sets `graphiql: true` | Rejected | Restrict to loopback/development or disable in production remote profile |

## Derived Layering (If Useful)

- UI layer: Phone Access card, Mobile pairing/shell components.
- Frontend state/transport layer: PhoneAccessStore, MobileNodeSessionStore, AuthorizedTransport, WindowNodeContextStore.
- Server transport layer: REST/GraphQL/WebSocket routes, static mobile host, route policy plugin.
- Server domain-control layer: PairingService, SettingsService, DeviceService, AuthService, AddressCandidateService, ClientFacingUrlResolver.
- Server persistence layer: PairedDeviceStore and RemoteAccessSettingsStore over existing file persistence utilities.

Layering is explanatory only; ownership boundaries above are authoritative.

## Migration / Refactor Sequence

1. Add server Remote Access domain/store/services with unit tests for pairing expiry, credential hashing, settings enable/disable, per-device revoke, revoke-all, and peer-socket loopback trust.
2. Add `remote-access-local-trust.ts`, `redact-sensitive-url.ts`, and URL redaction integration into HTTP access logging before introducing query-token WebSocket URLs.
3. Add REST management/pairing endpoints: status, address candidates, settings get/update, pairing session create/exchange, device list, per-device revoke, revoke-all.
4. Add Fastify HTTP/GraphQL route policy plugin using the explicit classification table; default unclassified routes to protected.
5. Add WebSocket query-token auth adapter and update WS route registration to verify credentials before stream handler connect, with close-code mapping.
6. Add `ClientFacingUrlResolver`, migrate MVP URL producers (`upload-file.ts`, `media-storage-service.ts` selected methods, mobile context preview helpers), and add no-loopback URL tests.
7. Add frontend MobileNodeSessionStore, credential storage, MobileConnectionDiagnostics, `websocketAuth.ts`, and AuthorizedTransport; wire Axios/Apollo/fetch/selected WebSocket flows.
8. Add Phone Access card in Settings > Nodes with enable toggle, address candidates/manual override, QR generation, paired-device list, per-device revoke, and revoke-all confirmation.
9. Add mobile first-run `/mobile` entry/shell, reconnect-on-open behavior, and mobile feature gates for selected MVP flows.
10. Add mobile Nuxt build profile and server static host for `/mobile`; update packaging to copy mobile assets into server resources.
11. Add validation tests: use-case spine coverage, non-loopback REST/GraphQL/WS auth required, Host/Origin/forwarded-header spoof rejected, GraphiQL remote rejected, external channel ingress classification preserved, disabled/revoked/revoke-all fail, generated URLs remote-safe, mobile no Electron API use.
12. Run manual Phase 0/1 validation over Tailscale: phone opens desktop tailnet URL, pairs, reconnects, uses selected REST/GraphQL/WebSocket flow, and records the actual tailnet URL/IP and diagnostics behavior.

Temporary seams allowed:

- PWA credential storage may use browser localStorage for MVP with documented risk, behind a `mobileCredentialStorage` adapter that native wrappers replace later.
- HTTP over private network is acceptable for first validation if app-level auth and VPN/private network are present; HTTPS polish remains follow-up.
- Direct application iframe/asset rendering can remain unsupported on mobile until authorized asset fetch/blob or signed asset URL design is added.

Temporary seams not allowed:

- No unauthenticated production remote REST/GraphQL/WebSocket access.
- No Host/Origin/forwarded-header based local trust.
- No core Tailscale-only dependency.
- No native Android-only implementation that bypasses PWA protocol.
- No WebSocket auth mechanism other than `WEBSOCKET_AUTH_QUERY_TOKEN` in the MVP.
- No loopback-only URL in mobile-supported generated URL responses.

## Key Tradeoffs

- **File store vs Prisma for paired devices:** File store is simpler and fits small device count; Prisma would be better for future multi-user/audit complexity. Choose file store for MVP, keep service boundary so persistence can change later.
- **Loopback trust vs requiring desktop credential:** Loopback trust preserves desktop simplicity and avoids injecting mobile auth into Electron renderer. It slightly trusts local machine users, which matches current desktop model.
- **PWA served by desktop server vs hosted frontend:** Desktop-served PWA gives same-origin simplicity and no cloud dependency. It needs packaging/static-serving work and may need HTTPS/native wrapper later for polished installability.
- **WebSocket query token vs subprotocol:** Query token is the chosen MVP mechanism because it is browser-portable and simple for existing clients; mandatory URL redaction and one helper on each side control the leakage risk. Subprotocol auth is deferred, not an alternative in this MVP.
- **Tailscale first vs provider matrix first:** Tailscale gives fast validation with low setup. Provider-agnostic design and docs prevent lock-in.

## Risks

- Auth route policy may accidentally break existing desktop flows if loopback/local policy is too broad or too narrow.
- WebSocket token mechanism may leak in logs if redaction is not enforced.
- Serving `/mobile` with Nuxt static base URL may require careful asset base configuration and SPA fallback.
- Browser/PWA installability may be limited over plain HTTP on iOS/Android; native wrapper or HTTPS may be needed for polished distribution.
- Some mobile-supported flows may still call `getServerUrls()` or Electron APIs unless audited with tests.
- Server-generated URL correction can be broader than expected because artifacts/media/context/application flows each compose URLs differently.
- Tailscale validation success may hide company VPN proxy/WebSocket restrictions; docs/diagnostics must not overfit to Tailscale.

## Guidance For Implementation

- Build the server auth/pairing skeleton before polishing mobile UI. A beautiful mobile shell without route auth is not a valid milestone.
- Keep the first mobile slice small: pairing, health/status, one agent run flow, one run history view, and one WebSocket stream are enough to prove the architecture.
- Use `windowNodeContextStore` and `deriveNodeEndpoints`; do not invent a second endpoint system for mobile.
- Add tests at the boundaries most likely to regress:
  - pairing code expiry and single-use behavior,
  - Phone Access disabled blocks pairing and mobile auth,
  - per-device revoke and revoke-all reject future REST/GraphQL/WebSocket access,
  - remote request rejected without token,
  - loopback request allowed where intended,
  - Host/Origin/forwarded-header spoof does not create local trust,
  - GraphiQL remote access rejected even with mobile credential,
  - external channel ingress still follows external signature/shared-secret policy,
  - Authorization added to Axios/Apollo/fetch,
  - WebSocket `access_token` helper used and close codes mapped,
  - HTTP/WS logs redact `access_token` and pairing codes,
  - mobile shell avoids `window.electronAPI`,
  - generated URLs are root-relative or paired-base URLs, not loopback for remote context,
  - every UC-MRA row remains mapped to at least one DS/RS/BLS spine.
- Treat Tailscale as Phase 0/1 validation profile and record the actual desktop tailnet URL/IP used in validation evidence.
