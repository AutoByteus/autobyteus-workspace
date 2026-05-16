# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Define a product-ready requirement set for **AutoByteus Remote Access**: a mobile-friendly Android/iOS/PWA client experience that lets a user connect to the server started by the desktop Electron AutoByteus app from a phone over any private network path the user or company already trusts.

The product must not be coupled to one VPN vendor. Tailscale may be the easiest personal setup, but AutoByteus should work the same way over LAN, company VPN, Tailscale, Headscale, NetBird, Netmaker/WireGuard, or any other private network where the phone can reach the desktop/server node.

The core user promise is:

> Start AutoByteus on desktop, enable Phone Access, scan a QR code from the phone, and then the phone app/PWA keeps working whenever it can reach that node. The user should not manually configure backend URLs, ports, tokens, or VPN internals inside AutoByteus.

## Product / Technical Judgement

- **Do not start with a native Android rewrite.** The right first implementation path is **mobile web/PWA-first** using the existing Nuxt frontend and node endpoint model, then optionally wrap it with Capacitor/native Android once pairing, auth, endpoint binding, and mobile capability gating work.
- This is **not mostly Android-side work**. Android packaging can be relatively small if the web client is made mobile-ready. The larger work is cross-platform product infrastructure:
  - app-level pairing/authentication,
  - remote node runtime binding,
  - server exposure/reachability status,
  - REST/GraphQL/WebSocket auth propagation,
  - remote-safe generated URLs,
  - mobile gating for Electron-only features,
  - validation over real private networks.
- Android-native value comes later for QR scanning polish, secure credential storage, app links, notifications, file sharing, and distribution. It should not own the core remote-access protocol.
- A throwaway smoke test can be done quickly over Tailscale/Headscale/LAN, but a production feature must not expose the current server API to reachable network peers without app-level auth.

## Investigation Findings

- Current desktop Electron starts the bundled server on fixed port `29695`; desktop renderer uses `http://127.0.0.1:29695` as the embedded node URL.
- Server CLI default host is `0.0.0.0`, and Electron server managers pass `--port 29695` but do not pass `--host`, so the server can be reachable from another device if OS firewall/private-network ACLs allow it.
- Fastify registers REST, GraphQL, and WebSocket routes with permissive CORS observed in prior investigation. No general app-wide authentication middleware was found in the inspected startup path; production remote access therefore requires explicit pairing/auth before supported use.
- Frontend already has a reusable node endpoint model that derives REST, GraphQL, and WebSocket URLs from one node base URL.
- Browser/non-Electron mode has localStorage-backed node registry behavior, but the current node-opening/binding UX remains desktop/Electron-window oriented.
- Some server-generated URLs use `AUTOBYTEUS_SERVER_HOST`; Electron currently sets this to loopback. Remote clients may receive unusable `127.0.0.1` URLs unless server/public URL handling becomes remote-aware.
- Existing Android Termux scripts are for running the server on Android; they are not the same thing as phone-as-client mobile access.
- External network options are viable as transport profiles:
  - Tailscale supports custom control server configuration and documents Headscale as a self-managed control-plane example.
  - Headscale describes itself as an open-source, self-hosted implementation of the Tailscale control server.
  - NetBird and Netmaker are self-hostable WireGuard-based private networking alternatives.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Missing Invariant; Duplicated Policy Or Coordination risk
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed before production remote access
- Evidence basis: Current server bind behavior, Electron loopback embedded config, Nuxt node endpoint derivation, browser fallback node registry, absent discovered general app auth, server-generated URL base handling.
- Requirement or scope impact: The feature must introduce a clear Remote Access owner/boundary rather than scattering VPN-specific checks, URL selection, auth token handling, and mobile bootstrapping across frontend stores and server routes.

## Recommendations

1. **Phase 0: connectivity smoke test only**
   - Use current desktop app/server and a phone on LAN/Tailscale/Headscale/company VPN.
   - Verify `http://<desktop-private-address>:29695/rest/health` and one GraphQL/WebSocket flow.
   - Treat this as a proof, not a product release, because app-level auth is missing.

2. **Phase 1: PWA/mobile web-first Remote Access foundation**
   - Add desktop “Phone Access” setting/status.
   - Add server pairing/auth/token model.
   - Add mobile runtime node binding and QR onboarding.
   - Serve or package the mobile web client so it can connect to a paired node without rebuild-time backend configuration.
   - Gate Electron-only features on mobile.

3. **Phase 2: Android wrapper if product polish requires it**
   - Wrap the mobile web client with Capacitor or equivalent.
   - Add native QR scanner, secure credential storage, deep links/app links, Android cleartext/HTTPS handling, share sheet, optional notifications.
   - Keep the core connection protocol identical to PWA.

4. **Phase 3: iOS wrapper and enterprise hardening**
   - Reuse the same mobile web/PWA core.
   - Add iOS secure storage, camera QR scanning, universal links, MDM/admin configuration if needed.
   - Add enterprise setup guides for existing VPN/internal DNS/SSO if required later.

5. **VPN strategy**
   - Keep AutoByteus provider-agnostic.
   - Provide first-party guides for: LAN, Tailscale, Headscale, existing company VPN, NetBird, Netmaker/WireGuard.
   - Do not require AutoByteus users to use hosted Tailscale.


## Effort Estimate / Delivery Sizing

Estimate assumes one strong full-stack engineer familiar with the codebase unless stated otherwise. Calendar time improves with parallel frontend/server ownership, but validation still requires integrated private-network testing.

| Scope | Approx effort | What it includes | Product quality |
| --- | --- | --- | --- |
| Connectivity proof of concept | 1-3 days | Run desktop server, manually point phone/browser PWA/dev frontend at private-network URL, test `/rest/health` and one GraphQL/WebSocket flow | Not shippable; useful feasibility proof only |
| Unsafe/manual mobile web prototype | 3-5 days | Basic mobile web entry, manual node URL entry, limited responsive fixes, no complete app-wide auth | Internal demo only |
| Secure PWA MVP / internal alpha | 2-4 engineering weeks | Desktop Phone Access QR, pairing token exchange, persisted mobile node binding, auth propagation for selected REST/GraphQL/WebSocket flows, first mobile-supported run/status slice, Electron-only gating | Usable by technical/internal users over private networks |
| Production beta PWA | 5-8 engineering weeks | Device management/revocation, generated URL fixes, stronger diagnostics, broader mobile UX pass, documentation for LAN/Tailscale/Headscale/company VPN, validation matrix, regression tests | Candidate for real users |
| Polished consumer/enterprise remote access | 8-12+ engineering weeks | Multi-node polish, HTTPS/cert/Tailscale Serve decisions, robust onboarding, admin docs, more complete mobile feature coverage, stronger observability, edge-case handling | Broader release quality |
| Android wrapper after PWA MVP | +1-2 engineering weeks | Capacitor/native shell, QR scanner, secure storage, app links, Android network policy, packaging | Android app distribution/polish; should reuse PWA protocol |
| iOS wrapper after PWA MVP | +1-3 engineering weeks | iOS shell, secure storage, camera scan, universal links/local-network policy, packaging | iOS app distribution/polish; should reuse PWA protocol |

Recommended first milestone: target the **Secure PWA MVP / internal alpha** rather than a native Android app. The fastest credible milestone is not just rendering the UI on a phone; it is making pairing/auth and selected REST/GraphQL/WebSocket flows safe and reliable over a private network.

Main effort drivers:

1. App-wide mobile pairing/auth across REST, GraphQL, and WebSocket routes.
2. Mobile runtime node binding that does not depend on Electron IPC or build-time backend URL.
3. Remote-safe server-generated URLs instead of loopback-only URLs.
4. Mobile UX gating for Electron-only features.
5. Real validation from a non-loopback phone/browser over at least LAN plus one VPN/private-network profile.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-MRA-001: Personal user runs AutoByteus desktop at home; desktop starts the bundled server.
- UC-MRA-002: User enables Phone Access from the desktop app and receives a QR/pairing flow.
- UC-MRA-003: User opens phone PWA/mobile app, scans the QR, and pairs to the desktop node.
- UC-MRA-004: User later opens the phone client away from home; if the private network reaches the desktop node, the app reconnects without manual backend configuration.
- UC-MRA-005: User uses Tailscale as the private network path.
- UC-MRA-006: Advanced user uses Headscale as a self-hosted Tailscale-compatible control plane.
- UC-MRA-007: Company user uses an existing corporate VPN or internal private network.
- UC-MRA-008: Advanced/company user uses NetBird, Netmaker, or raw WireGuard.
- UC-MRA-009: User sees understandable connection diagnostics when phone cannot reach the desktop node.
- UC-MRA-010: Desktop user can view and revoke paired phone clients.
- UC-MRA-011: Mobile user can use supported server-owned flows such as agents, agent teams, run history, workspace/file browsing where safe, applications where mobile compatible, and relevant settings.
- UC-MRA-012: Mobile user is not shown desktop-only or Electron-only controls that cannot work on phone.

## Out of Scope

- AutoByteus-operated VPN/cloud relay service for this first ticket.
- Public internet exposure without a private network/VPN.
- Full native Android UI rewrite independent from the Nuxt web frontend.
- Full native iOS UI rewrite.
- Running the complete AutoByteus server locally on iOS.
- Making the Android Termux server profile the default phone experience.
- Enterprise SSO/RBAC/MDM policy management beyond documenting compatibility with existing company VPNs.
- Push notifications unless selected as a later native-wrapper milestone.
- Solving desktop sleep/wake/reliable always-on host management beyond clear status/diagnostics.

## Functional Requirements

### Product Positioning / Delivery Path

- R-MRA-001: AutoByteus Remote Access shall be VPN-provider agnostic; core app behavior shall depend on reachability to a node base URL and app-level pairing/auth, not on Tailscale-specific APIs.
- R-MRA-002: The first implementation target shall be mobile web/PWA-first, reusing the existing Nuxt frontend where practical.
- R-MRA-003: Android native work shall initially be treated as an optional wrapper/distribution layer over the mobile web client, not as a separate product protocol.
- R-MRA-004: The requirements and design shall separate prototype connectivity from production-supported remote access.

### Desktop Phone Access Setup

- R-MRA-010: Desktop app shall provide a “Phone Access” entry point in settings or node/server settings.
- R-MRA-011: Phone Access shall show whether the desktop server is running and which port/base URL candidates are available.
- R-MRA-012: Phone Access shall show private-network address candidates when discoverable, such as LAN IP, Tailscale/Headscale IP or MagicDNS hostname, or user-entered/company VPN hostname.
- R-MRA-013: Phone Access shall not require the user to understand internal ports/tokens for the recommended pairing flow.
- R-MRA-014: Phone Access shall expose an advanced/manual URL override for company VPNs and advanced users.
- R-MRA-015: Phone Access shall generate a time-limited, single-use pairing payload suitable for QR and app-link/deep-link transfer.
- R-MRA-016: Phone Access shall provide copyable fallback pairing information for cases where QR scanning is unavailable.

### Pairing / Authentication / Authorization

- R-MRA-020: Server shall implement app-level pairing for phone clients before production remote access is considered supported.
- R-MRA-021: Pairing shall exchange a short-lived one-time pairing code for a longer-lived per-device credential.
- R-MRA-022: The stored phone credential shall identify the paired device and support later revocation.
- R-MRA-023: REST APIs used by mobile shall require a valid credential unless explicitly classified as unauthenticated bootstrap/health endpoints.
- R-MRA-024: GraphQL APIs used by mobile shall require a valid credential unless explicitly classified as unauthenticated bootstrap/health endpoints.
- R-MRA-025: WebSocket APIs used by mobile shall require a valid credential, including agent, agent-team, terminal, file-explorer, and any future mobile-supported sockets.
- R-MRA-026: Auth failure shall produce consistent, user-actionable mobile errors such as “pair again,” “device revoked,” or “server requires newer app.”
- R-MRA-027: Desktop shall provide a paired-device management surface showing device name, first paired time, last seen time when available, and revoke action.
- R-MRA-028: Revoked mobile credentials shall stop working for REST, GraphQL, and WebSocket access.
- R-MRA-029: Pairing tokens and long-lived credentials shall not be logged in plaintext by frontend, server, Electron, or diagnostics.

### Private Network / VPN Provider Support

- R-MRA-030: Product shall officially support “bring your own private network” as a connection mode.
- R-MRA-031: Documentation shall include a simple personal path using Tailscale.
- R-MRA-032: Documentation shall include an open/self-hosted path using Headscale.
- R-MRA-033: Documentation shall include company VPN guidance where AutoByteus is reached through an internal hostname/IP.
- R-MRA-034: Documentation shall include at least one WireGuard-based self-hosted alternative profile such as NetBird or Netmaker.
- R-MRA-035: The app shall not block or special-case unknown VPN providers if the server URL is reachable and pairing succeeds.
- R-MRA-036: The connection diagnostics shall distinguish “cannot reach server,” “server reachable but pairing/auth failed,” “WebSocket blocked,” and “feature unsupported on mobile.”

### Mobile Client Bootstrapping / Node Binding

- R-MRA-040: Mobile client shall start in a first-run “Connect to AutoByteus node” flow when no paired node exists.
- R-MRA-041: Mobile client shall support QR scan/import of a pairing payload.
- R-MRA-042: Mobile client shall support manual server URL entry for advanced/company users.
- R-MRA-043: Mobile client shall normalize the node base URL and derive REST, GraphQL, and WebSocket endpoints from it using a single shared endpoint derivation policy.
- R-MRA-044: Mobile client shall persist paired node metadata and credential in platform-appropriate storage: browser storage for PWA with clear risk documentation, native secure storage for Android/iOS wrapper.
- R-MRA-045: Mobile client shall support reconnect on app reopen without asking the user to re-enter URL or token.
- R-MRA-046: Mobile client shall support deleting/unpairing a node locally.
- R-MRA-047: Mobile client shall present connection status for the currently selected node.
- R-MRA-048: Multi-node support shall be preserved conceptually, but the MVP may support one active paired node first if the design records the extension path.

### Frontend / Mobile UX Capability Gating

- R-MRA-050: Mobile client shall reuse server-owned web capabilities where practical instead of duplicating business logic in native code.
- R-MRA-051: Mobile client shall hide or replace Electron-only features, including desktop update controls, desktop-only local folder pickers, Electron browser shell surfaces, and Electron IPC-only flows.
- R-MRA-052: Mobile client shall avoid calling `window.electronAPI` or Electron preload APIs in mobile/PWA runtime paths.
- R-MRA-053: Mobile layouts shall be touch-friendly for the first supported flows and shall not depend on desktop-only window sizing assumptions.
- R-MRA-054: Mobile unsupported features shall show an explicit unsupported-state only when the user reaches a relevant area; they shall not produce broken controls or runtime exceptions.
- R-MRA-055: The first supported mobile functional slice shall include at least: connection/pairing, server health/status, agent run start/view, agent-team run start/view or an explicitly chosen narrower run flow, and run history visibility.

### Server URL / Generated Asset URL Handling

- R-MRA-060: Server-generated URLs returned to remote mobile clients shall not point to desktop loopback addresses such as `127.0.0.1` unless the client is local loopback.
- R-MRA-061: Server shall have a clear public/client-facing base URL policy for remote access, derived from the paired request context, configured external URL, or explicit server setting.
- R-MRA-062: Media/file/artifact/application URLs exposed to mobile shall be validated over a remote private-network address in acceptance testing.
- R-MRA-063: Desktop embedded renderer may continue using loopback internally, but loopback must not leak as the only usable URL to a paired remote client.

### Security / Safety

- R-MRA-070: Production-supported remote access shall not rely only on VPN ACLs, CORS, port obscurity, or “private network means safe.”
- R-MRA-071: Supported remote access shall be disabled or clearly marked unsafe until app-level auth covers mobile-accessible REST, GraphQL, and WebSocket endpoints.
- R-MRA-072: Health/bootstrap endpoints that remain unauthenticated shall return only non-sensitive data.
- R-MRA-073: The pairing flow shall expire unused one-time pairing codes.
- R-MRA-074: The desktop UI shall allow the user to disable Phone Access without deleting paired-device records. While disabled, new pairing sessions shall not be created and all non-loopback mobile credentials shall be rejected with a user-actionable `PHONE_ACCESS_DISABLED`/forbidden result.
- R-MRA-075: If HTTPS is not available for the MVP private-network path, the app shall explicitly document the security posture and rely on private network encryption plus app-level auth; later design should evaluate HTTPS/Tailscale Serve/custom cert options.
- R-MRA-076: The desktop UI shall provide a revoke-all paired phones action that permanently invalidates every paired-device credential and requires every phone to pair again.
- R-MRA-077: Phone Access enable/disable state and revoke-all outcomes shall be persisted across server restarts and shall apply consistently to REST, GraphQL, and WebSocket access.

### Android / iOS Packaging

- R-MRA-080: Android wrapper, if implemented, shall consume the same pairing payload and server APIs as the PWA.
- R-MRA-081: Android wrapper shall add native QR scanning only as a convenience over the same pairing flow.
- R-MRA-082: Android wrapper shall store credentials in Android secure storage rather than plain localStorage.
- R-MRA-083: Android wrapper shall define an HTTP/HTTPS policy for private-network node URLs, including cleartext allowance only when explicitly accepted for private VPN/LAN MVP.
- R-MRA-084: iOS wrapper, if implemented, shall consume the same pairing payload and server APIs as PWA/Android.
- R-MRA-085: Native wrappers shall not fork or duplicate server business logic.

### Documentation / Setup Guides

- R-MRA-090: Documentation shall explain that AutoByteus requires a reachable private network path but does not require a specific VPN vendor.
- R-MRA-091: Documentation shall include “recommended easiest personal setup” and “open/self-hosted setup” paths separately.
- R-MRA-092: Documentation shall state that Headscale/NetBird/Netmaker/self-hosted VPNs are admin/advanced-user tasks, not zero-config consumer setup.
- R-MRA-093: Documentation shall include firewall guidance for allowing the AutoByteus server port only on trusted/private interfaces where possible.
- R-MRA-094: Documentation shall include troubleshooting steps for URL unreachable, port blocked, DNS not resolving, auth failed, WebSocket blocked, desktop asleep, and app not running.

### Validation / Release Readiness

- R-MRA-100: Validation shall include phone/browser-to-desktop smoke test over LAN or equivalent local private network.
- R-MRA-101: Validation shall include phone/browser-to-desktop smoke test over Tailscale or Headscale-like tailnet when available.
- R-MRA-102: Validation shall include at least one REST health/status request, one GraphQL request, and one WebSocket-backed run/status flow.
- R-MRA-103: Validation shall verify auth enforcement for REST, GraphQL, and WebSocket endpoints from a non-loopback client.
- R-MRA-104: Validation shall verify revoked phone credentials stop working.
- R-MRA-105: Validation shall verify mobile runtime does not call Electron-only APIs in supported flows.
- R-MRA-106: Validation shall verify server-generated file/media/artifact URLs work from phone and do not resolve to `127.0.0.1` unless intentionally local.

## Acceptance Criteria

- AC-MRA-001: A requirements/design review can clearly see that PWA/mobile web is the first recommended build target, with Android as wrapper/distribution layer rather than separate protocol.
- AC-MRA-002: A user can enable Phone Access on desktop and receive a QR or equivalent pairing payload without manually editing URLs/tokens in normal flow.
- AC-MRA-003: A phone client with no existing node can pair to a desktop node using the pairing payload.
- AC-MRA-004: After first pairing, the phone client reconnects to the paired node on reopen without manual setup.
- AC-MRA-005: The same pairing and connection model works over at least LAN and one VPN/private overlay profile.
- AC-MRA-006: The implementation does not contain core Tailscale-only connection assumptions; manual/private-network URL remains valid for company VPN and self-hosted VPN users.
- AC-MRA-007: Mobile REST access requires valid app-level credentials except approved bootstrap/health endpoints.
- AC-MRA-008: Mobile GraphQL access requires valid app-level credentials except approved bootstrap/health endpoints.
- AC-MRA-009: Mobile WebSocket access requires valid app-level credentials.
- AC-MRA-010: Desktop can list and revoke paired phones.
- AC-MRA-011: Revoked phone credentials fail for REST, GraphQL, and WebSocket use.
- AC-MRA-018: Disabling Phone Access blocks new pairing sessions and causes existing paired-phone REST, GraphQL, and WebSocket access to fail with a distinct disabled/forbidden result without deleting the paired-device list.
- AC-MRA-019: Revoke-all invalidates every paired phone credential; each phone must pair again before REST, GraphQL, or WebSocket access succeeds.
- AC-MRA-012: Mobile client derives endpoint URLs from one normalized node base URL and does not rely on rebuild-time backend URL for paired nodes.
- AC-MRA-013: Supported mobile flows avoid Electron IPC/preload calls and do not show broken Electron-only controls.
- AC-MRA-014: Remote mobile clients do not receive unusable loopback-only generated URLs for files/media/artifacts in validated flows.
- AC-MRA-015: Documentation includes Tailscale, Headscale, company VPN, and WireGuard-based self-hosted provider guidance.
- AC-MRA-016: Validation evidence includes REST, GraphQL, and WebSocket checks from a non-loopback client.
- AC-MRA-017: Connection failure states distinguish network reachability failures from auth failures and unsupported mobile features.

## Constraints / Dependencies

- Current desktop app is Electron-based and starts the bundled server internally.
- Current embedded desktop node URL is loopback on port `29695`.
- Server must stay running and desktop must remain reachable for phone-as-client mode.
- iOS cannot run the Electron app; iOS is client-only for this path.
- PWA/browser storage is weaker than native secure storage; native wrappers may be needed for stronger credential storage.
- Some VPN/self-hosted network setups require administrative knowledge; AutoByteus can guide them but should not claim to make Headscale/NetBird/Netmaker zero-config.
- App-store policies, Android cleartext traffic policies, and iOS local network permissions may affect native-wrapper packaging.

## Assumptions

- Primary first value is controlling/using the desktop-hosted AutoByteus node from phone, not running all backend workloads locally on phone.
- Existing Nuxt frontend can be made mobile/PWA-compatible for a focused first slice.
- Existing node endpoint derivation can be reused or strengthened as the shared endpoint policy.
- Users or companies can provide a private network path; AutoByteus should make app pairing easy once reachability exists.
- A future managed relay/cloud option may be valuable, but it is not part of this first requirement set.

## Risks / Open Questions

- Current server appears reachable broadly before app-level auth; production remote access must not ship in that state.
- Mixed-content/browser HTTPS restrictions may influence whether the PWA is served from the desktop server, hosted separately, or wrapped natively.
- OS firewall and VPN ACLs may block port `29695`; diagnostics and docs must handle this.
- Mobile browser/PWA QR scanning support may be less smooth than native scanning; this affects whether Android wrapper should be pulled earlier.
- Some existing frontend flows may still use build-time runtime config rather than current node context.
- Generated URL behavior must be audited flow-by-flow.
- The first mobile supported flow must be intentionally selected; trying to make the entire desktop UI mobile-compatible in one phase may be too large.
- Secure local storage for PWA credentials may be acceptable for prototype but weaker for production.
- Desktop sleep/offline state may make the product feel unreliable unless surfaced clearly.

## Requirement-To-Use-Case Coverage

- R-MRA-001: UC-MRA-005, UC-MRA-006, UC-MRA-007, UC-MRA-008
- R-MRA-002: UC-MRA-003, UC-MRA-004, UC-MRA-011, UC-MRA-012
- R-MRA-003: UC-MRA-003, UC-MRA-004
- R-MRA-004: UC-MRA-001, UC-MRA-002
- R-MRA-010 through R-MRA-016: UC-MRA-001, UC-MRA-002, UC-MRA-003, UC-MRA-010
- R-MRA-020 through R-MRA-029: UC-MRA-003, UC-MRA-004, UC-MRA-010
- R-MRA-030 through R-MRA-036: UC-MRA-005, UC-MRA-006, UC-MRA-007, UC-MRA-008, UC-MRA-009
- R-MRA-040 through R-MRA-048: UC-MRA-003, UC-MRA-004, UC-MRA-009
- R-MRA-050 through R-MRA-055: UC-MRA-011, UC-MRA-012
- R-MRA-060 through R-MRA-063: UC-MRA-004, UC-MRA-011
- R-MRA-070 through R-MRA-077: UC-MRA-002, UC-MRA-003, UC-MRA-004, UC-MRA-010
- R-MRA-080 through R-MRA-085: UC-MRA-003, UC-MRA-004
- R-MRA-090 through R-MRA-094: UC-MRA-005, UC-MRA-006, UC-MRA-007, UC-MRA-008, UC-MRA-009
- R-MRA-100 through R-MRA-106: All in-scope use cases as release readiness coverage

## Acceptance-Criteria-To-Scenario Intent

- AC-MRA-001: Confirms build-order decision and prevents premature native rewrite.
- AC-MRA-002 through AC-MRA-004: Cover no-hassle first-run and returning-user flow.
- AC-MRA-005 through AC-MRA-006: Cover VPN-agnostic product posture.
- AC-MRA-007 through AC-MRA-011: Cover app-level security and per-device revoke behavior.
- AC-MRA-018 through AC-MRA-019: Cover Phone Access disabled state and revoke-all behavior.
- AC-MRA-012: Covers runtime node binding rather than per-user builds.
- AC-MRA-013: Covers mobile/Electron boundary safety.
- AC-MRA-014: Covers remote-safe generated URL behavior.
- AC-MRA-015: Covers product documentation and open/self-hosted path.
- AC-MRA-016: Covers executable validation breadth.
- AC-MRA-017: Covers user-understandable failure handling.

## Approval Status

Approved for design direction by user on 2026-05-16 after discussion: proceed with Tailscale as first validation path, keep product VPN-agnostic, and start deeper spine-led design work. Refined after architecture review round 1 to make Phone Access disable and revoke-all behavior explicit.
