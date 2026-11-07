# Investigation Notes — one-step-phone-pairing (autobyteus-395, with autobyteus-391 merged in)

## Investigation Meta

- Package identifier: `one-step-phone-pairing`
- Request / ticket: Project Task `autobyteus-395` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (now also covers the cancelled `autobyteus-391`, switching nodes inside `/mobile`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`, branch `codex/one-step-phone-pairing`
- Resolved base remote / branch / revision: `origin/personal` @ `ff68bfb5fa14b4849acc317371575b349ae8a1dd` (fetched 2026-11-07)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree created from the fetched base; no blocker
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-07): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; templates for requirements, investigation notes and solution revision record
- Investigation status: requirements investigation complete for SR-001; architecture investigation not started (it follows approval)

## Initial Request And Clarifications

- Original request (the user, 2026-11-06, condensed by the PM): "Is it possible like there's just one button? It doesn't matter whether I use Tailscale or not, on a local machine or with Tailscale. I just enable it, click and it generates a QR code, I go to my phone, open the software, scan, and then I'm connected. In the future, whenever I want, I can use it. On the Docker node I can also do it this way: scan. I can add multiple nodes on my phone…"
- Clarifications received:
  - 2026-11-06: "The very easiest: on the page the user just generates a QR code, and then scans it, that's it. Currently I have to select and input the address or something … on the phone we should make it easier to add more than one node (not more than one device) … We have two Docker nodes and desktop nodes."
  - 2026-11-07: "lets go". The PM merged autobyteus-391 (switch between paired nodes inside `/mobile`) into this Task; the Solution Designer asks the user directly for decisions, including DEC-003 option B of autobyteus-277; the Product Team designs the screens; design first, nothing built before the user approves.
  - Earlier (autobyteus-277, his words): "if we are able to pair with multiple ones, we can just switch between different nodes, right? That would be very convenient."
- User-supplied facts and constraints: no new Android permission without approval; trusted private network and Tailscale assumptions not weakened without his decision; no secrets, live QR codes or his real node addresses in screenshots, logs or committed files; his real paired phones and data stay as they are; tests use isolated nodes; existing paired phones must not become unusable without his agreement.
- Initial ambiguity: what "with or without Tailscale" can honestly mean (reachability is a network fact, not an app setting); whether AutoByteus may run Tailscale; how a Docker node, which cannot see the host's network, gets a phone-reachable address.

## Product And Domain Understanding

- Product area: Phone Access (Remote Access) — desktop Nodes page › Phone Setup tab, the node's `/rest/remote-access/*` routes, the `/mobile` web shell, the Android shell app.
- Affected actors or systems: the user at the desktop; the user's phone (Android shell; browser/PWA); each node (embedded desktop node, local Docker nodes, nodes on other machines).
- Existing purpose: pair a phone with one node over a private network, then use the `/mobile` shell.
- Terminology: *node* (one AutoByteus server); *embedded node* (the desktop's own); *Docker node*; *pairing code* (5-minute single-use); *mobile credential* (`mra_…`, long-lived, per phone per node); *origin* (scheme + host + port; the browser storage boundary); *Tailscale Serve* (Tailscale's HTTPS proxy on the `*.ts.net` name); *tailnet address* (a `100.64.0.0/10` address given by Tailscale).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-07 | User | Task screenshots 24.png, 25.png (desktop Phone Setup), 26.jpg (Android first screen) | What the user sees | E-01: desktop: Tailscale install/Serve commands, "Target mobile URL", paste URL, cleartext acknowledgement, "Discovered URL candidates" preselecting `http://[fe80::…]:29695`, Create QR, Revoke all phones, Active (1) / Revoked/History (31). Phone: title, Tailscale advice, "unreachable" banner, Saved nodes (Open/Remove), URL field, HTTP checkbox, Save and open, Paste, Scan QR, Open Tailscale, "Recommended setup" paragraph | — |
| 2026-11-07 | Code | `autobyteus-web/stores/phoneAccessStore.ts`, `components/settings/PhoneAccessCard.vue`, `PhoneSetupGuideCard.vue`, `NodeManager.vue` | Desktop flow | E-02: QR needs a selected URL; default = first HTTPS candidate else first private-HTTP candidate; HTTP needs a checkbox; a remote (non-embedded) node window requires a manually typed URL and checks it reaches the same node by `nodeId` (`verifyAdvertisedUrlForRemoteQr`). Phone Access must be enabled with a separate checkbox first | — |
| 2026-11-07 | Code | `autobyteus-server-ts/src/server-addressing/server-address-candidate-service.ts`, `remote-access/services/address-candidate-service.ts` | Where candidates come from | E-03: every non-internal interface address of the process becomes a candidate with the configured port; any non-tailnet address is labelled "Private/LAN" (also link-local `fe80::`/`169.254.*`, public addresses); order = OS interface order; no reachability check | — |
| 2026-11-07 | Runtime | `curl http://localhost:{8001,8003}/rest/remote-access/address-candidates` and `/status` (read-only GET on the user's two Docker nodes; addresses redacted) | Docker node candidates | E-04 (Measured): a Docker node offers only "This desktop only" (`localhost:8001`) and `http://172.17.x.x:8001` (container-internal IP with the *host* port) — neither reachable from a phone. Both return `serverName: "AutoByteus Desktop"` | — |
| 2026-11-07 | Runtime | `docker ps --format '{{.Names}} {{.Ports}}'` | Is a Docker node reachable from the LAN at all? | E-05 (Measured): server ports are published on all interfaces (`0.0.0.0:8001->8000`, `0.0.0.0:8003->8000`, `0.0.0.0:50433->8000`); VNC ports are loopback-only. So a phone on the LAN or tailnet can reach a Docker node at *host address : published port*; only the desktop side (host) knows both | — |
| 2026-11-07 | Runtime | `dig -x <tailnet-ip> @100.100.100.100`; `node -e "dns.promises.reverse('<tailnet-ip>')"`; `curl https://<magicdns-name>/rest/remote-access/status`; `curl http://<tailnet-ip>:29695/rest/remote-access/status` (names redacted in the record) | Can the node detect Tailscale and its HTTPS name without running Tailscale? | E-06 (Measured on this Mac, Tailscale running with Serve): a plain reverse DNS lookup of the tailnet address through the system resolver returns the `<machine>.<tailnet>.ts.net` name (no Tailscale command, no local API); the HTTPS probe of that name returns 200 (Serve is set up); HTTP on the tailnet address and port 29695 also returns 200 (the embedded node listens on all interfaces) | Architecture: confirm on Linux and Windows hosts; confirm when MagicDNS is off |
| 2026-11-07 | Web | Tailscale docs/blog: `tailscale serve` (https://tailscale.com/kb/1242/tailscale-serve, https://tailscale.com/blog/reintroducing-serve-funnel) | Serving several nodes on one machine | E-07 (Read): `tailscale serve --bg --https=<port> <local port>` serves another local port on another HTTPS port of the same name; `… off` removes one mapping; `serve reset` clears the whole configuration | — |
| 2026-11-07 | Code | `autobyteus-web/utils/phoneSetupGuideCommands.ts` | Current Tailscale guide | E-08: commands hard-code port 29695 (wrong for a Docker node window) and include `serve reset`, which removes every Serve mapping the user has | — |
| 2026-11-07 | Code | `autobyteus-android/.../MainActivity.kt` (`qrScanCoordinator` → `submitInput(decodedText, httpAcknowledged = false)`), `shell/ConnectionInputResolver.kt`, `connection/PairingLinkParser.kt` | What happens when the app scans an HTTP QR | E-09 (Read): an HTTP pairing QR from the app's own scanner fails with "HTTP needs acknowledgement"; the user must tick the checkbox and press Save and open — a second acknowledgement after the desktop's | Not run on a device |
| 2026-11-07 | Code | `MainActivity.openReachableEntry` (`displayName = serverName.ifBlank { entry.displayName }`), `ConnectionValidator` (status `serverName`), server `api/rest/remote-access.ts:39` (`serverName: "AutoByteus Desktop"`) | Why several nodes are hard to tell apart | E-10 (Read + Measured): the app replaces the name from the QR with the status name, which every node returns as "AutoByteus Desktop" (measured on both Docker nodes). Several saved nodes all show "AutoByteus Desktop". The node itself has no name of its own; names live in the desktop's node registry | — |
| 2026-11-07 | Code | `autobyteus-web/utils/remoteAccess/mobileCredentialStorage.ts`, `stores/mobileNodeSessionStore.ts`; Android `SavedNodeEntry.kt`, `SavedNodeStore.kt`, `TrustedNavigationPolicy.kt`; 277 `investigation-notes.md` E-09 | Several nodes; switching | E-11 (Read): the credential lives in the page's `localStorage` of the node's origin; one session per origin; the app saves one entry per origin and opens the last selected one at start. The page cannot see the app's saved nodes; another origin opens outside the WebView. A node reached at a second address is a second origin with no session (re-pair) | — |
| 2026-11-07 | Code | `autobyteus-android/.../ui/ConnectionScreen.kt`, `WebShellScreen.kt` | Phone first screen | E-12 (Read): a form: title, Tailscale advice, busy/diagnostic card, Saved nodes (Open/Remove), URL field, HTTP checkbox, Save and open, Paste, Scan QR, Open Tailscale, "Recommended setup". In the web shell the only way back is Back or "Edit" on an error overlay | — |
| 2026-11-07 | Code | `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` | Pairing in the page | E-13 (Read): a link with `?pairing=` shows "Pairing link detected", a device-name field (default "Phone") and "Pair this phone" — one more tap after the scan | — |
| 2026-11-07 | Code | `grep` for `getUserMedia`, `navigator.clipboard`, `serviceWorker`, `crypto.subtle`, `randomUUID` under `components/mobile`, `stores`, `utils`; Android manifest | Does `/mobile` need HTTPS (a secure context)? | E-14 (Read): `/mobile` uses none of them except `randomUUID`, which has a fallback (277 DEC-014). The Android shell permits cleartext (`network_security_config.xml`) and already holds `CAMERA`; no `RECORD_AUDIO`. So an HTTP address works for today's phone features. iOS ATS behavior for HTTP IP addresses: unknown | U-002 |
| 2026-11-07 | Code | `remote-access-pairing-service.ts`, `paired-device-service.ts`, `pairing-url-policy.ts`, `redact-sensitive-url.ts`, `docs/features/remote_access.md` | Security facts | E-15 (Read): code = 18 random bytes, 5 minutes, single use, kept in memory; the QR holds the code, the node address and a name — no long-lived secret. Credential = `mra_` + 32 random bytes, only its SHA-256 stored; revocable one by one or all; phone credentials cannot manage pairing or devices; pairing params are redacted in logs. Revoked rows are kept forever (31 on the user's node). No rate limit on `pairing-exchanges`, but a 144-bit code cannot be guessed. HTTP pairing on a non-private host is refused; on a private host only with the acknowledgement flag | — |
| 2026-11-07 | Doc | `tickets/done/mobile-experience-redesign/*` (277: DEC-003, FU-001 = 391, ui-ux-spec path) | Prior decisions | E-16: DEC-003 = A (paired node only, read-only peer list); B = switch nodes in the page, waited for his word. Product design repository `/Users/normy/autobyteus_org/autobyteus-web-design` | — |
| 2026-11-07 | Doc | `tickets/done/phone-setup-lan-qr/requirements.md`, `tickets/done/android-pairing-security-hardening/requirements.md` | Why the HTTP acknowledgement exists | E-17: home-network HTTP was restored as an explicit trusted-network path with acknowledgement on the desktop and the existing Android acknowledgement; Docker node QR creation was made to require a manually entered phone-facing URL because candidates inside the container are not reachable | — |
| 2026-11-07 | Doc | `tickets/done/android-keep-page-on-rotation/follow-ups.md` FU-002 (in autobyteus-409) | The PM's "QR-scan address clearing" | E-18: cancelling a scan clears the typed address on the connection screen. A scan-first screen with the address field moved to "Other ways" changes this screen | Coordinate with 409 |
| 2026-11-07 | Doc | `tickets/done/android-apk-build-and-download/requirements.md` | How a fresh phone gets the app | E-19: the APK is published on GitHub Releases and offered on the AutoByteus website; the node does not serve it | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path | Current Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Desktop: Nodes › Phone Setup, embedded node | Enable checkbox → read Tailscale guide → choose a candidate or paste a URL → tick HTTP acknowledgement for HTTP → Create QR code | QR with one address; often the wrong default (link-local IPv6) | E-01, E-02, E-03 | High (Read + screenshot) |
| BEH-002 | User | Same, in a Docker node's window | Must type a phone-facing URL by hand (candidates are inside the container); verified by `nodeId` | No QR without knowing the host address and port | E-02, E-04, E-05, E-17 | High (Measured) |
| BEH-003 | User | Same, in a window of a node on another machine | Must type a phone-facing URL; verified by `nodeId` | Works only for users who know the address | E-02 | High (Read) |
| BEH-004 | User | Phone: scan with the app | HTTP QR → "needs acknowledgement" → tick → Save and open → page "Pair this phone" → paired | Three steps after the scan for HTTP; two for HTTPS | E-09, E-13 | Medium (Read, not run) |
| BEH-005 | User | Phone: several nodes | Each node paired separately; app lists them as Saved nodes, all named "AutoByteus Desktop"; switching only via Back to the native screen | Possible but hard to tell apart and to reach | E-10, E-11, E-12 | High |
| BEH-006 | User | Desktop: paired phones | Active / Revoked-History tabs; Revoke; Revoke all phones next to Create QR | Revoked rows pile up (31) | E-01, E-15 | High |
| BEH-007 | Contract | Existing paired phones and links | Credential per origin; QR payload v1 `{serverBaseUrl, pairingCode, expiresAt, serverName}`; app parses `?pairing=` links | Works | E-11, E-15 | High |

## Relevant Codebase And Technical Facts

| Path / Component | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `server-addressing/server-address-candidate-service.ts` | Interface addresses → candidates | Needs filtering (no link-local/loopback/container), kinds (Tailscale/home network), and a reachability check | Who verifies (node itself, desktop)? |
| `remote-access/services/pairing-url-policy.ts` | URL rules + HTTP acknowledgement | The trust rules stay; the acknowledgement may be remembered (DEC-004) and Tailscale addresses may be classed differently (DEC-003) | Where a remembered decision is stored |
| `remote-access/services/remote-access-pairing-service.ts` | Code + payload v1 with one `serverBaseUrl` | Payload grows an ordered address list while old apps keep reading `serverBaseUrl` | Exchange check compares one base URL today |
| `api/rest/remote-access.ts` status | `serverName` constant | Phone must show each node's own name | Name from the QR (desktop registry) vs. a node-held name |
| `autobyteus-web/stores/phoneAccessStore.ts`, `PhoneAccessCard.vue`, `PhoneSetupGuideCard.vue` | Desktop UI | Replaced by one action and plain-words states (Product design) | Desktop side assembles host addresses for Docker nodes |
| Android `MainActivity`, `ConnectionScreen`, `PairingLinkParser`, `ConnectionInputResolver`, `SavedNodeStore` | Native shell | Scan-first screen, no second acknowledgement for a scanned pairing QR, address list, names, node list reachable from the page | How the page asks the app to show the node list (no credential crosses) |
| `/mobile` `MobilePairingBootstrap.vue`, `MobileConnectionSheet.vue` | Pairing page, connection sheet | Auto-pair after an in-app scan; "Switch node"/"Add a node" in the Android app (DEC-001) | How the page knows it runs in the app |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- QR / pairing link: `/mobile?pairing=<base64url JSON v1>`; read by `/mobile` (`mobileNodeSessionStore.parseQrText`), Android `PairingLinkParser`, iOS core (not checked in detail).
- `remote-access/settings.json` (`phoneAccessEnabled`), `paired-devices.json` (device rows incl. revoked), `node-identity.json`.
- Android `SharedPreferences` `saved_nodes` (entries keyed by origin).
- Evidence paths: E-11, E-15.

### Structural Surfaces

- REST: `/rest/remote-access/{status,settings,address-candidates,pairing-sessions,pairing-exchanges,devices…}`; route classes in `api/security/remote-access-route-policy.ts` (public: status, pairing-exchanges, `/mobile`); Origin guard of autobyteus-403 (same-origin / no Origin allowed).
- Desktop renderer ↔ node windows (`windowNodeContextStore`), node registry (names, base URLs, node types).
- Android WebView navigation policy (same origin only).

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — pairing payload (additive), address candidates (kinds, verification), possibly status name.
- Persistence schema or invariant change: Possibly — a remembered home-network trust decision per node; Android saved entries may gain fields (name, node ID, address list).
- Security or privacy boundary change: Yes, bounded — DEC-003, DEC-004; no new route class intended.
- Concurrency or lifecycle change: QR/session lifetime on screen.
- Deployment/ownership: none expected.
- Confirmed absent/present/unknown: see Assumptions/Unknowns.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| `curl …:8001` / `…:8003` `/rest/remote-access/address-candidates`, `/status` | Docker node candidates and name | Only `localhost` and container-internal `172.17.x.x:<host port>`; name "AutoByteus Desktop" | Measured | REQ-003, REQ-006, REQ-011 | E-04 |
| `docker ps` | Docker server port exposure | `0.0.0.0:<port>->8000` | Measured | REQ-006 | E-05 |
| reverse DNS + HTTPS/HTTP probes | Tailscale detection without Tailscale commands | `.ts.net` name found; HTTPS 200; tailnet HTTP 200 | Measured (macOS only) | REQ-003, REQ-005, REQ-008 | E-06 |

- Temporary diagnostics: None (read-only GETs and DNS lookups; no change to the user's nodes, Tailscale or data; real names and addresses not recorded).
- Reproduction for implementation to start from: None yet; E-09 and E-10 become failing checks in design.

## Stakeholder And User Evidence

| Source / Actor | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user, 2026-11-06 | One button → QR → scan → connected; same for Docker nodes; with or without Tailscale | Direct words | REQ-001…REQ-009 | DEC-002, DEC-003, DEC-004 |
| The user, 2026-11-06 | Several nodes on one phone ("two Docker nodes and desktop nodes") | Direct words | REQ-011…REQ-013 | DEC-001 |
| The user, 277 review | "switch between different nodes … very convenient" | Direct words | REQ-013 | DEC-001 |
| PM constraints | No new Android permission; trust model not weakened without him; no secrets/real addresses committed | Task | QR-001…QR-004 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Tailscale (separate app/account) | Tailscale docs | MagicDNS names under `*.ts.net`; Serve per HTTPS port; WireGuard encryption between devices | E-06, E-07 | MagicDNS off → no name; `100.64/10` is also carrier-grade NAT space, so a 100.x address alone does not prove Tailscale (U-001) |
| Browser storage / origins | Web platform | Storage per origin; HTTP non-loopback origins are not secure contexts | E-11, E-14 | Future phone features needing HTTPS |
| Android | Platform | Camera permission held; cleartext allowed by app config | E-14 | — |
| Docker port publishing | Docker | Server port on `0.0.0.0` | E-05 | Users who publish on `127.0.0.1` only |

## Persisted Data And State Facts

- Affected subjects: `paired-devices.json` (unchanged rows; maybe display only), `settings.json` (maybe a remembered home-network decision), Android `saved_nodes` (existing entries must keep opening).
- Volume: a handful of devices per node (user: 1 active, 31 revoked); a handful of saved nodes per phone.
- Required: existing credentials keep working; existing saved nodes keep opening; revoked history not lost.
- Acceptable loss: none required.
- Remaining gap: architecture decides whether saved-entry fields need a transition (Android has a data-migration pattern: `SavedNodeEntryKeysMigration`).

## Product Design Request Context

- Product Design request in the current input: `Present` — the Task: "the Product Team designs the screens" (phone first screen, desktop Phone Setup, the connection sheet).
- User's requested outcome, in his terms: "just one button … click and it generates a QR code … scan, and then I'm connected"; "make it easier to add more than one node"; the phone setup today is "complicated and ugly".
- Requirement IDs involved: REQ-001, REQ-002, REQ-004, REQ-005, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015.
- Product decision to explore: the desktop "Connect a phone" panel and its states; the phone's first screen and node list; pairing progress/failure screens; the "Switch node / Add a node" entry in the connection sheet; the tidy paired-phones list.
- Critical journey and states: SCN-001…SCN-008 in the requirements doc.
- Constraints and non-goals: requirements doc Scope Guardrail; feasibility per requirement there.
- Existing context: 277 UI/UX spec (`/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md`); screenshots in the Task.
- Product Design request artifact: [product-design-request.md](product-design-request.md), delegated 2026-11-07 to `/product_team` (team run `product_team_b757e3f9fae5423b9e4167f8540e437e`, coordinator `product_ui_ux_designer_a1399629bb864a55aecc65bb555fd38b`) at the user's request ("yes send to product team").

## Product Design Findings

- Requested 2026-11-07; awaiting the Product Team's result.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| Task context files 24.png, 25.png, 26.jpg | The user | Current screens | Evidence | BEH-001…BEH-006 | Read | Not behavior-defining; show his real node name — never copy into a repository |
| `follow-ups.md` | Solution Designer | Follow-ups | — | FU-001… | Created | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Detecting Tailscale reliably on Linux/Windows hosts and when MagicDNS is off; telling a Tailscale 100.x address from carrier-grade NAT | Wrongly calling an address "Tailscale" would skip the home-network trust decision | Architecture; rule: "Tailscale" only when the reverse name ends in `.ts.net` (or an equally positive signal) | Open |
| U-002 | Unknown | iOS ATS with HTTP IP addresses | iOS parity later | iOS follow-up (FU-001) | Open |
| U-003 | Unknown | The desktop renderer probing a phone-facing address of another node (CORS/Origin of 403) | Verification of Docker/remote node addresses from the desktop | Architecture; the request gate allows no-Origin and `file://`/loopback origins (remote_access.md) | Open |
| R-001 | Risk | The node can only prove an address reaches *the node* from the node/desktop side, not from the phone | A verified address may still be unreachable from the phone (phone not on the tailnet/Wi-Fi) | The phone tries the QR's addresses in turn and says plainly what is missing (REQ-007, REQ-010) | Accepted by design |
| R-002 | Risk | A leaked QR within 5 minutes lets someone who can reach the node pair a phone | Security note for the user | Short life, single use, visible in paired phones, revoke; QR shown only on request and dismissed (REQ-016) | Accepted, explained |

## Requirement Implications

- One action is feasible: the node (or, for a Docker node, the desktop on its host) can list addresses, classify them, verify each reaches the same node, and choose without the user (E-03…E-07).
- "With or without Tailscale" is honest as: with Tailscale on computer and phone, the phone connects anywhere; without it, at home on the same Wi-Fi; the screen says which.
- Several nodes already work technically; what fails is naming (E-10), discoverability (E-12) and switching (E-11).
- The second HTTP acknowledgement on the phone and the extra "Pair this phone" tap are the phone-side friction (E-09, E-13).

## Notes For Architecture Design

- Map SCN-001…SCN-008 after approval. Verify U-001 and U-003 on real hosts; keep the payload additive (BEH-007); keep the 403 Origin rule and phone route list intact (no new phone WebSocket route expected).
