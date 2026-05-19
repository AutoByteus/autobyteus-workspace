# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — refreshed on 2026-05-19 after Round 3 mobile validation returned a Design Impact / Requirement Gap for functional mobile journey parity; refreshed again after Round 4 browser validation returned Design Impact / UX refinement required for delivery readiness; branch-currency corrected after Round 10 validation found a shared single-agent command-identity failure on a worktree behind `origin/personal`; latest `origin/personal` already contains that shared fix, so no separate command-identity ticket remains. Non-WebSocket Round 10 UX findings are triaged as polish/design follow-up with no new immediate blocker.

## Goal / Problem Statement

Define a product-ready requirement set for **AutoByteus Remote Access**: a mobile-friendly Android/iOS/PWA client experience that lets a user connect to the server started by the desktop Electron AutoByteus app from a phone over any private network path the user or company already trusts.

The product must not be coupled to one VPN vendor. Tailscale may be the easiest personal setup, but AutoByteus should work the same way over LAN, company VPN, Tailscale, Headscale, NetBird, Netmaker/WireGuard, or any other private network where the phone can reach the desktop/server node.

The core user promise is:

> Start AutoByteus on desktop, enable Phone Access, scan a QR code from the phone, and then the phone app/PWA keeps working whenever it can reach that node. The user should not manually configure backend URLs, ports, tokens, or VPN internals inside AutoByteus. Once paired, the phone must let the user complete the practical desktop-web work journeys that make Remote Access useful, while the normal desktop/web layout and workflows remain unchanged.

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
- Mobile product readiness is not satisfied by a phone-shaped shell alone. The mobile PWA must cover a declared functional parity matrix for the desktop-web journeys that are required from a phone.
- Desktop/web non-regression is a hard product constraint: mobile routing, feature gates, and refactors must not change the normal desktop workspace layout, desktop run configuration journey, or desktop file/activity workflows except through explicitly reviewed shared-core fixes.
- Round 4 validation showed core mobile functional parity now mostly works; final delivery readiness depends on reducing mobile decision risk and density: status wording must reflect mixed-success states, launch setup must prevent wrong-target launches, launch summary/context must be clear, Activity must be scannable, large-folder file browsing needs mobile discovery aids, and selected context files must remain adjacent to send/launch decisions. Runtime/provider failures such as a missing LLM API key after launch are desktop-equivalent functionality and are out of scope for this mobile UX ticket as long as the error is visible on mobile.
- Round 10 validation initially identified a shared single-agent command-identity failure from a worktree behind `origin/personal`: the shared frontend single-agent streaming path appeared to send `SEND_MESSAGE` without backend-required command identity. Per the user's scope clarification, that was never mobile-only and must not be fixed as a mobile UX local patch. Refreshed solution-design check on 2026-05-19 against latest `origin/personal` `98cfdc24` found the shared fix already present: `AgentStreamingService.sendMessage(...)` serializes identity, `agentRunStore` generates stable command dedupe keys, ACK rejection handling exists, and focused tests pass. The obsolete command-identity dependency/ticket has been removed; the mobile branch must use the integrated latest-base branch before final validation rather than reimplementing the shared fix.
- Round 10 non-WebSocket UX findings are captured as mobile polish/product-scope follow-up rather than immediate blockers. Activity density, large-folder file discovery, context visibility, and intentional target selection are already covered by R-MRA-132/R-MRA-133/R-MRA-136/R-MRA-137/R-MRA-138 and AC-MRA-038/040/041/042. Runtime/model visibility is clarified under R-MRA-134/AC-MRA-039: mobile may stay simplified for MVP, but the launch summary must show the resolved runtime/model when available or clearly state the desktop-default source instead of vague copy.
- Round 11 validation passed the latest-base mobile functional-parity MVP with real Codex App Server / `gpt-5.5` single-agent continuation, attached-file send, team continuation, team launch, Activity, stale `/mobile/workspace`, and desktop `/workspace` no-regression. UX-MRA-050 through UX-MRA-054 are accepted as later polish, not current-ticket blockers: clearer runtime/default-source copy, calmer mixed-status wording, better long Activity drill-in, larger attachment removal affordance, and stronger launch-summary prominence.

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

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Feature with same-ticket mobile UX and functional parity rework.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Missing Invariant; Duplicated Policy Or Coordination risk; File Placement Or Responsibility Drift in mobile shell reuse; Legacy Or Compatibility Pressure if squeezed desktop panels/placeholders are kept as the mobile path.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed for production remote access and for the mobile same-ticket rework. Refactor must remove mobile dependence on desktop panel navigation and must isolate mobile navigation from normal desktop/web shell state.
- Evidence basis: Current server bind behavior, Electron loopback embedded config, Nuxt node endpoint derivation, browser fallback node registry, absent discovered general app auth, server-generated URL base handling, Round 3 mobile validation screenshots showing unreadable real-data rows, run setup placeholder, file preview/attach placeholder, activity/team-message no-op, the user's 2026-05-19 clarification that mobile must support practical desktop-web journeys, Round 4 validation showing remaining UX issues after functional paths became executable, and Round 10 branch-currency validation showing the shared single-agent command-identity gap is already fixed on latest `origin/personal` and is not a mobile UX scope item.
- Requirement or scope impact: The feature must introduce clear Remote Access and Mobile Work Experience owners/boundaries rather than scattering VPN-specific checks, URL selection, auth token handling, mobile bootstrapping, mobile run launch, file preview/attach, and activity/team-message behavior across desktop shell components. Desktop/web journeys must remain protected by route/component boundaries and regression checks.

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
- UC-MRA-013: Mobile user continues an existing agent run or team run, reads the conversation, attaches context when needed, and sends a message from the phone.
- UC-MRA-014: Mobile user starts a new agent run from a phone by selecting an agent, selecting/confirming workspace, providing required launch inputs, entering an initial prompt, and landing in the chat/run stream.
- UC-MRA-015: Mobile user starts a new team run from a phone by selecting a team, confirming workspace/defaults, entering an initial prompt for the focused member/coordinator path, and landing in the team chat/run stream.
- UC-MRA-016: Mobile user browses workspace files, previews supported text/code/markdown content, and attaches a file/path context to the current chat with visible composer feedback.
- UC-MRA-017: Mobile user opens task plan, team messages, and tool/activity history from the phone without needing the desktop right panel.
- UC-MRA-018: Desktop/web user continues to use the normal desktop workspace, run configuration, file, team, and activity journeys with no mobile shell or feature-gate regression.

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
- Adding new provider/API-key preflight or changing when runtime/provider configuration errors are discovered; mobile should show the same post-launch agent/runtime errors desktop shows.

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


### Mobile UX Redesign Same-Ticket Rework

- R-MRA-110: The mobile PWA shall use a phone-first navigation model rather than a compressed desktop panel layout.
- R-MRA-111: After pairing, the mobile home shall show connection status, current node, a clear primary next action, recent work, and secondary troubleshooting/unpair actions.
- R-MRA-112: Mobile work screens shall use at most one persistent task navigation model, with no more than four task destinations.
- R-MRA-113: The mobile work shell shall expose the primary task destinations as Chat, Runs, Files, and Activity or equivalent user-intent labels.
- R-MRA-114: The desktop left panel/full workspace tree shall not be the default mobile navigation; mobile context switching shall use a focused picker/sheet.
- R-MRA-115: The mobile Chat screen shall make conversation and message composition the primary phone task after selecting, continuing, or starting work.
- R-MRA-116: Desktop-only or unsupported mobile features shall show clear unsupported states and recovery actions instead of broken controls, no-op controls, placeholders that look actionable, or half-rendered desktop UI.
- R-MRA-117: The mobile MVP shall satisfy a functional parity matrix for practical desktop-web work journeys; a phone-shaped shell alone is not sufficient.
- R-MRA-118: Mobile Home, Runs, and Context Switcher rows shall remain readable with real workspace/run/team names at a 390x844 phone viewport; user-identifying titles must not be crushed by status/workspace metadata pills.
- R-MRA-119: A paired phone user shall be able to continue an existing agent run and an existing team run, see the conversation, see a composer, and send a message using the same authorized REST/GraphQL/WebSocket boundaries as desktop web.
- R-MRA-120: A paired phone user shall be able to start a new agent run through a complete mobile path: choose/confirm agent, choose/confirm workspace, use the same launch configuration/default behavior as desktop web, enter an initial prompt, launch, and land in Chat/Runs.
- R-MRA-121: A paired phone user shall be able to start a new team run through a complete mobile path: choose/confirm team, choose/confirm workspace/defaults, use the same member/runtime/model configuration/default behavior as desktop web, enter an initial prompt for the focused/coordinator path, launch, and land in Chat/Runs.
- R-MRA-122: Mobile context switching shall support Recent, Agents, Teams, and Workspaces without exposing the desktop tree as the default navigation and without creating duplicate authoritative context-selection state.
- R-MRA-123: Mobile Files shall browse workspace folders, search/filter visible files, and open supported text/code/markdown files through authorized APIs with size/error limits; large, binary, or unsupported content shall show explicit unsupported states.
- R-MRA-124: Mobile file/context attachment shall add a visible context item to the Chat composer, show the file name/count and remove action, and include the context when the next message/run launch is sent.
- R-MRA-125: Mobile Activity shall provide a phone replacement for required desktop right-panel information: task plan, team messages, run events, and tool-call/activity history. Interactive terminal/tool panes may be intentionally unsupported for MVP only if the UI clearly disables or explains them and still shows relevant run/tool history where available.
- R-MRA-126: Enabled mobile controls shall either complete the promised action or be disabled with an explicit mobile-scope explanation; no enabled no-op controls are allowed.
- R-MRA-127: The normal desktop/web workspace journey shall remain unchanged by the mobile redesign: desktop routes keep the left panel, center workspace, right panel, desktop run configuration, desktop files, and desktop team/tool/activity surfaces.
- R-MRA-128: Legacy compressed-desktop mobile behavior shall be removed/refactored from the mobile runtime instead of kept behind compatibility wrappers, including desktop left tree default navigation, stacked top tabs, duplicated Team surfaces, and placeholder run/file/activity affordances.
- R-MRA-129: Mobile implementation shall reuse existing authoritative run, team, file, activity, context-attachment, node-binding, and auth transports where they own business logic; it shall not fork a mobile-only protocol or duplicate server/domain logic.
- R-MRA-130: If existing shared stores/components mix desktop view navigation with domain selection or conversation/file/activity rendering, the implementation shall refactor toward shared domain/content owners plus separate desktop and mobile shell/navigation owners before adding more mobile behavior.

- R-MRA-131: Mobile status/diagnostics shall use a composite reachability model. If the Remote Access status endpoint is unavailable but other authorized APIs such as GraphQL, files, or run data succeed, Mobile Home shall not say `Cannot reach desktop` or `Offline`; it shall show node reachable / Remote Access status unknown or version/status endpoint unavailable with clear recovery guidance.
- R-MRA-132: Mobile Run Setup shall require intentional target choice unless launched from an explicit agent/team/workspace context. It shall not auto-select the first arbitrary agent, team, or workspace from a large list.
- R-MRA-133: Mobile Run Setup shall use phone-appropriate searchable pickers or sheets for agent/team/workspace selection, prioritizing recent/current/favorite/contextual choices before all choices. Huge native select lists are not the desired steady-state mobile UX.
- R-MRA-134: Mobile Run Setup shall show a compact launch summary adjacent to the launch button, including target, workspace, context files that will be included, and runtime/model visibility. For the MVP, mobile may use existing desktop/agent defaults instead of exposing full runtime/model selectors, but the summary shall show the resolved runtime/model when available or explicitly state that the agent's desktop default runtime/model will be used.
- R-MRA-135: Mobile launch shall not add new provider/API-key preflight behavior that changes desktop-web launch semantics. Runtime/provider failures such as a missing LLM API key may surface after launch exactly as they do on desktop; the mobile requirement is only that the resulting error remains visible and understandable in the mobile Chat/Activity surface.
- R-MRA-136: Mobile Activity shall be scannable by default: task/team/tool sections shall use compact rows, counts, filters/chips, priority/error states, and expand/detail actions instead of rendering long messages, commands, or logs inline by default.
- R-MRA-137: Mobile Files shall support large-workspace discovery aids beyond visible-folder filtering: recent files, attached/current-run files where available, type filters such as markdown/code, sticky breadcrumb/current-folder context, and an explicit deep-search action when searching beyond the visible folder.
- R-MRA-138: Mobile context-file visibility shall stay adjacent to the actual send or launch decision. A top tray may be supplemental, but composer and Run Setup launch controls shall show the exact files/count that will be included and avoid duplicate/conflicting indicators.

### External Shared Platform Dependency

- Latest-base branch boundary: latest `origin/personal` `98cfdc24` already contains the shared single-agent command-identity behavior required for real single-agent stream execution. This mobile UX ticket shall not implement a mobile-only workaround, duplicate WebSocket sender, or patch the shared streaming contract.
- Implementation now has mobile work merged with `origin/personal` `98cfdc24`; future validation must stay on that base or newer and discard/ignore stale scratch edits for command identity. If a missing-identity failure reappears after that, treat it as a regression against the shared base, not as mobile UX local work.
- Mobile delivery posture after refresh: mobile UX implementation can be reviewed for phone-only surfaces, practical work journeys, and desktop no-regression; full real-run Codex/GPT-5.5 single-agent launch/send should be revalidated on the refreshed base and is no longer blocked by a separate command-identity ticket.

### Mobile Functional Parity Matrix

| Desktop-Web Journey / Capability | Mobile MVP Decision | Required Mobile Behavior | Unsupported / Simplified Boundary |
| --- | --- | --- | --- |
| Pair and reconnect to a desktop node | Must work | Pair from QR/link/manual payload, persist paired node, reconnect on reopen, show composite status/diagnostics that distinguish network unreachable from status endpoint/version mismatch | None for MVP. |
| Continue existing agent run | Must work | Open recent/active agent run, show conversation/composer, send message over authorized transports | None for supported run types. |
| Continue existing team run | Must work | Open recent/active team run, show team conversation/focused member composer, send message where desktop supports it | Complex member navigation may be simplified but must not block focused/coordinator messaging. |
| Start new agent run | Must work | Intentionally select/confirm agent and workspace through mobile pickers, follow existing desktop launch defaults/config behavior, show launch summary, enter prompt, launch, land in Chat/Runs | Advanced config may be collapsed; post-launch runtime/provider errors are acceptable when they match desktop behavior and remain visible. Real single-agent stream execution should be validated after the mobile branch is merged with `origin/personal` `98cfdc24` or newer, which already contains the shared command-identity fix. |
| Start new team run | Must work | Intentionally select/confirm team and workspace/defaults through mobile pickers, follow existing desktop member/runtime/model defaults/config behavior, show launch summary, enter prompt, launch, land in team Chat/Runs | Advanced member overrides may be collapsed; post-launch runtime/provider errors are acceptable when they match desktop behavior and remain visible. |
| Choose/switch workspace/context | Must work | Focused picker with Recent / Agents / Teams / Workspaces and readable real-data rows | Full desktop tree is not default mobile navigation. |
| Browse workspace files | Must work, simplified | Drill into folders, search/filter visible files, maintain sticky workspace/folder context, offer recent/attached/type filters, and provide explicit deep search for large workspaces | Bulk desktop file operations are not required. |
| Preview file content | Must work for supported files | Load text/code/markdown under safe size through authorized API and show loading/error/unsupported states | Large/binary/media previews may be unsupported or link/open later. |
| Attach file/context to chat | Must work | Add visible context item/count adjacent to composer or launch button and include it in send/launch payload | Upload/photo/share-sheet can wait for native wrapper/later milestone; duplicate/conflicting indicators are not acceptable. |
| View task plan | Must work for team runs | Show task list/status from existing team context/hydration state | Editing task plans from mobile is not required. |
| View/open team messages | Must work | `Open team messages` changes visible state and shows compact message summaries with expansion/detail states | Read/write policy follows existing desktop capability; no enabled no-op. |
| View tool-call/activity history | Must work, read-only | Show compact run/tool activity summaries, filters/chips, error priority, and expanded details for commands/logs | Live tool management/configuration is not required. |
| Interactive terminal/tool/browser panes | Intentionally unsupported for MVP unless existing safe viewer exists | Show clear unsupported/desktop-required notice and disable unavailable controls | Must not expose broken panes or misleading buttons. |
| Settings/troubleshooting/unpair | Must work | Status, retry diagnostics, copy safe diagnostics, unpair local phone | Desktop revoke/manage devices remains desktop Phone Access. |
| Normal desktop/web journey | Must remain unchanged | Desktop routes keep desktop shell and workflows; desktop regression tests/spot-checks remain green | Mobile shell/gates must not leak into `/workspace` or desktop settings beyond Phone Access. |


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


- AC-MRA-020: A paired phone user can identify connection status, current work context, and the primary next action within the mobile home/work shell.
- AC-MRA-021: A paired phone user can continue or open an existing agent/team chat/run without using the desktop left panel as the primary navigation, and the chat composer is visible and usable.
- AC-MRA-022: Mobile work navigation shows one task surface at a time and does not stack multiple persistent tab bars.
- AC-MRA-023: Mobile context switching is available through a focused picker/sheet with Recent, Agents, Teams, and Workspaces or equivalent grouping.
- AC-MRA-024: Desktop layout and behavior remain unchanged by the mobile UX redesign.
- AC-MRA-025: Real-data mobile Home, Runs, and Context Switcher rows remain readable at a 390x844 viewport with long workspace/run/team names; status/workspace metadata does not collapse the user-identifying title.
- AC-MRA-026: A paired phone user can complete a new agent-run launch path in validation using safe fixture/test data or an approved live run: select agent, select/confirm workspace, satisfy required launch inputs/defaults, enter prompt, launch, and land in Chat/Runs. Single-agent live send shall be validated on the refreshed branch; latest `origin/personal` `98cfdc24` already contains the shared command-identity fix, so any reappearing missing-identity failure is a shared-base regression rather than a mobile UX local fix.
- AC-MRA-027: A paired phone user can complete a new team-run launch path in validation using safe fixture/test data or an approved live run: select team, select/confirm workspace/defaults, use existing launch defaults/config behavior, enter prompt, launch, and land in team Chat/Runs.
- AC-MRA-028: Mobile Files can browse a workspace, open a supported text/code/markdown file through authorized APIs, show actual content or a concrete fetch/size error, and avoid placeholder preview copy.
- AC-MRA-029: `Attach to chat` from mobile Files or context attach flow adds a visible composer context item/count with file name and remove action; the next mobile send/launch includes that context. Live single-agent execution of that send should be validated after the branch is merged with `origin/personal` `98cfdc24` or newer.
- AC-MRA-030: Mobile Activity can show task plan status, open team messages into a visible detail/empty state, and show run/tool activity history or explicit read-only/unsupported states.
- AC-MRA-031: Every enabled mobile action has a visible state change or completed effect; intentionally unsupported actions are disabled or routed to a clear unsupported notice.
- AC-MRA-032: Mobile implementation removes/refactors compressed desktop mobile navigation; `/mobile` does not default to desktop left tree, stacked top tabs, duplicated Team navigation, or desktop right panel.
- AC-MRA-033: Normal desktop/web routes, especially `/workspace`, continue to render and behave as the desktop shell with left panel, center workspace, and right-side surfaces; mobile feature gates do not redirect or restyle desktop routes.
- AC-MRA-034: Shared run/team/file/activity changes are covered by desktop and mobile tests or spot-checks so refactors do not regress the normal desktop-web journey.
- AC-MRA-035: Mobile run launch, file preview/attach, and activity views reuse authoritative existing stores/services/transports or refactored shared domain/content owners; no duplicate mobile-only business protocol is introduced.
- AC-MRA-036: Any refactor of legacy desktop-coupled shared state separates domain selection/content ownership from desktop/mobile shell navigation before adding new mobile behavior.

- AC-MRA-037: When `/rest/remote-access/status` is missing, version-mismatched, or unavailable but GraphQL/files/runs succeed, Mobile Home shows a mixed-success status such as node reachable/status unknown and does not claim the desktop is unreachable.
- AC-MRA-038: Mobile Run Setup does not auto-select arbitrary first agent/team/workspace choices from large lists; users must intentionally choose or confirm context-derived defaults through mobile-friendly searchable pickers/sheets.
- AC-MRA-039: Mobile Run Setup shows a compact target/workspace/runtime-model-source/context launch summary next to the launch action and does not introduce mobile-only provider/API-key preflight gating. The runtime/model row either shows the resolved value or clear copy such as `Uses the agent's desktop default runtime/model`; if the launched agent reports a runtime/provider error such as a missing API key, that error is visible in mobile Chat/Activity as it is on desktop.
- AC-MRA-040: Mobile Activity renders team messages/tool history/task plan as compact, scannable summaries with filters or section controls and expansion/detail affordances; long commands/logs/messages are clamped or hidden by default.
- AC-MRA-041: Mobile Files supports large-folder navigation with sticky breadcrumb/current-folder context plus at least two discovery aids among recent files, attached/current-run files, type filters, and explicit deep search.
- AC-MRA-042: Mobile context files are shown adjacent to the actual composer send button and Run Setup launch button; top-level trays and shared composer indicators do not conflict about what will be sent.
- AC-MRA-043: The mobile UX ticket records the Round 10 command-identity finding as a stale-branch/shared-base issue already fixed on latest `origin/personal` `98cfdc24` and does not introduce a mobile-only WebSocket `SEND_MESSAGE` payload builder, hidden mobile-only dedupe scheme, or duplicate shared single-agent streaming patch.

## Constraints / Dependencies

- Current desktop app is Electron-based and starts the bundled server internally.
- Current embedded desktop node URL is loopback on port `29695`.
- Server must stay running and desktop must remain reachable for phone-as-client mode.
- iOS cannot run the Electron app; iOS is client-only for this path.
- PWA/browser storage is weaker than native secure storage; native wrappers may be needed for stronger credential storage.
- Some VPN/self-hosted network setups require administrative knowledge; AutoByteus can guide them but should not claim to make Headscale/NetBird/Netmaker zero-config.
- App-store policies, Android cleartext traffic policies, and iOS local network permissions may affect native-wrapper packaging.
- Latest `origin/personal` `98cfdc24` already contains the shared frontend single-agent command-identity fix; mobile implementation is now merged with that refreshed base and needs final live Codex/GPT-5.5 single-agent launch/send signoff on this integrated branch.

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
- The mobile functional parity matrix must stay bounded to practical phone journeys; trying to clone the entire desktop UI on phone remains too large and is explicitly rejected.
- Shared-store refactors that separate domain/content ownership from desktop/mobile shell navigation can regress normal desktop/web journeys unless covered by desktop tests or spot-checks.
- Secure local storage for PWA credentials may be acceptable for prototype but weaker for production.
- Desktop sleep/offline state may make the product feel unreliable unless surfaced clearly.
- If mobile work is validated from a stale branch behind `origin/personal` `98cfdc24`, it can expose a single-agent send failure that is already fixed on base; refresh the branch instead of masking it with a mobile-only workaround.

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
- R-MRA-110 through R-MRA-138: UC-MRA-011, UC-MRA-012, UC-MRA-013, UC-MRA-014, UC-MRA-015, UC-MRA-016, UC-MRA-017, UC-MRA-018
- Latest-base command-identity behavior: UC-MRA-011 and UC-MRA-015 single-agent live send execution must be revalidated after merging `origin/personal` `98cfdc24` or newer

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
- AC-MRA-020 through AC-MRA-024: Cover the phone-first navigation shell and desktop no-regression baseline.
- AC-MRA-025 through AC-MRA-031: Cover functional mobile parity for readable real-data lists, existing/new run journeys, files, attachments, activity/team messages, and no-op prevention.
- AC-MRA-032 through AC-MRA-036: Cover legacy compressed-mobile removal, normal desktop/web journey protection, shared-owner reuse, and refactor safety.
- AC-MRA-037 through AC-MRA-042: Cover Round 4 UX refinement and Round 10 non-WebSocket UX follow-up: composite status, intentional mobile target picking, launch summary with clear runtime/model/default-source visibility and desktop-equivalent runtime error handling, scannable Activity, large-folder file discovery, and context visibility next to send/launch.
- AC-MRA-043: Covers the Round 10 branch-currency refresh: the command-identity finding was not mobile-only and latest `origin/personal` already has the shared fix; no duplicate mobile local fix is allowed.

## Approval Status

Approved for design direction by user on 2026-05-16 after discussion: proceed with Tailscale as first validation path, keep product VPN-agnostic, and start deeper spine-led design work. Refined after architecture review round 1 to make Phone Access disable and revoke-all behavior explicit. Refined again on 2026-05-19 after Round 3 API/E2E found a Design Impact / Requirement Gap: mobile must support practical desktop-web journeys from a phone, while the normal desktop/web journey must remain unchanged and legacy compressed-desktop mobile behavior must be refactored out of the mobile runtime. Refined a third time on 2026-05-19 after Round 4 API/E2E showed the functional paths mostly work but delivery readiness still requires UX simplification for status clarity, launch target safety, launch summary/context clarity, Activity density, file discovery, and context visibility near send/launch. User clarified that provider/API-key failures discovered after launch are desktop-equivalent behavior and out of scope for this mobile UX ticket. Branch-currency corrected after Round 10 API/E2E and user clarification: the command-identity finding came from a stale shared path, was not mobile-only, and latest `origin/personal` `98cfdc24` already contains the shared fix; no separate command-identity ticket remains. Round 10 non-WebSocket mobile UX findings were triaged as polish/design follow-up: existing Activity/files/context/target-selection requirements already cover the desired direction, and runtime/model visibility is clarified as resolved-value-or-default-source copy rather than full advanced configuration for MVP. Round 11 latest-base validation passed the mobile functional-parity MVP; UX-MRA-050 through UX-MRA-054 remain later polish and do not block delivery.
