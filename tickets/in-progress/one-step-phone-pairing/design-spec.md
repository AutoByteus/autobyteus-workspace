# Design Spec — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Solution And Approval Basis

- Current solution revision ID: `SR-012`
- Approved requirements baseline: [requirements-doc.md](requirements-doc.md) at SR-011, `Approved`: the user's approval of the UI/UX design ("if things are consistant. then i approve", 2026-11-07) plus the Solution Designer within his direction. SR-012 adds DEC-019…DEC-021, which simplify the design without a visible change (below).
- Behavior-defining supplement: the Product Team's UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (Approved; UI reference `d2e960cc`, record `34677c88`), VIS-001…VIS-034, UXJ-001…008, TR-001…018. Its texts are normative.
- User approval of the design: `Obtained`. The user, 2026-11-07, in the Solution Designer's conversation, answering "Shall I go ahead?": "I trust that you can make reasonable decisions. For this ticket, we need to release a beta. since for my codex i dont have limit now, i waive for codex if delivery engineer asks".
- Design status: `Ready`
- Canonical investigation notes: [investigation-notes.md](investigation-notes.md) (E-01…E-27)
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`, `/DESIGN.md` (root; rules 1, 4, 5, 7, 9, 10, 11, 12; Data Migration Guideline pointer; GLOSSARY.md), `GLOSSARY.md` (Nodes). `design-examples.md` not used.
- Conflicts or discrepancies: none with the general principles. DESIGN.md rule 9 (no compatibility between versions) does not cover the Android app on the phone; REQ-017 keeps installed apps and existing pairings working. This design needs no compatibility code for it: the QR payload is unchanged (DEC-019).

## Current-State Read

- **Desktop.** Nodes › Phone Setup mounts `PhoneSetupGuideCard.vue` (Tailscale terminal guide with hard-coded port 29695 and `serve reset`, E-08) and `PhoneAccessCard.vue`. `phoneAccessStore.ts` loads settings, `/rest/remote-access/address-candidates`, active and revoked devices (`loadAll`, lines 115–135). The user chooses or types an address. HTTP needs a checkbox. A non-embedded window must type a URL that `verifyAdvertisedUrlForRemoteQr` (lines 165–190) checks by `nodeId` through `/rest/remote-access/status`. Then `createPairingSession` (lines 192–234) posts `serverBaseUrl`, `serverName` and the acknowledgement.
- **Node.** `server-addressing/server-address-candidate-service.ts:60-139` lists every non-internal interface address with the configured port. Link-local and public addresses are labelled LAN; there is no reachability check (E-03). In a container these are container-internal addresses (E-04, Measured). `remote-access/services/address-candidate-service.ts` adapts that list for Phone Access only. `memory-sync.ts:80` and `remote-collaboration-settings.ts:121` use the server-addressing service directly.
  - `remote-access-pairing-service.ts:51-92` validates the URL (`pairing-url-policy.ts:96-160`: HTTPS; or private HTTP with acknowledgement), creates a 5-minute single-use code in memory, and returns `/mobile?pairing=<base64url JSON v1 {version, serverBaseUrl, pairingCode, expiresAt, serverName}>`. `exchangePairingCode` (lines 94–152) consumes it and creates a device with `clientFacingBaseUrl`.
  - `api/rest/remote-access.ts:25-41` answers status with a constant `serverName: "AutoByteus Desktop"`.
  - `remote-access-settings-service.ts:17-28` replaces the whole settings object.
  - Disabling Phone Access leaves open codes in memory, so they work again if it is re-enabled within 5 minutes (Read).
- **Phone page (`/mobile`).** `MobilePairingBootstrap.vue:116-120` pairs on "Pair this phone" with a device-name field. The session lives in the origin's `localStorage` (`mobileCredentialStorage.ts:3`). `MobilePairedShell.vue:126` names the node from `lastStatus.serverName`, the constant. `MobileConnectionSheet.vue` shows peers and "Check connection".
- **Android app.**
  - `MainActivity.kt:50` passes a scanned QR to `submitInput(…, httpAcknowledged = false)`. `ConnectionInputResolver` then refuses HTTP without the checkbox (E-09).
  - `openReachableEntry` (line 178) overwrites the payload's name with the status constant (E-10).
  - `ConnectionScreen.kt` is the form of screenshot 26 (E-12). Saved entries are keyed by origin (`SavedNodeEntry.kt`).
  - The scanner is journeyapps' `CaptureActivity`; `CAMERA` is already held.
- **Constraints.** 403's Origin rule and phone route list. The trusted-private-network model. No new Android permission. Existing credentials and saved nodes must keep working.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: three subsystems change together:
  - server remote-access: new network-facts owner, routes, pairing session changes;
  - desktop web: the Phone Setup panel and store are replaced;
  - `/mobile` page and the Android app: start screen, scanner, connecting flow, bridge.

  About 40 files added, changed or removed (Target Mapping).
- Architectural risk: `High`
- Risk rationale:
  - **Security trust rules:** HTTP is acknowledged without a question for Tailscale and VPN addresses, and the local-network answer is remembered per network.
  - **New owner routes and a native-to-page bridge in the Android WebView.**
  - **Per-OS network detection** (U-001, U-004, U-005: macOS measured, Linux read only).
  - **A new persisted file and additive record fields.**
- Escalation trigger:
  - **Detection:** detection on Linux cannot tell Tailscale, VPN or bridge interfaces apart by the rules below.
  - **Tailscale Serve:** Serve refuses the HTTPS port rule (U-006).
  - **The 403 Origin rule** blocks the desktop's address checks.
  - **The Android bridge** needs a new permission.

  Any of these returns to the Solution Designer as `Design Impact`.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| E-04, E-05 | Docker node probes, `docker ps` | Container addresses useless; server ports published on `0.0.0.0` | DS-002: host facts from the embedded node + the Docker node's port | Users publishing on loopback → blocked message |
| E-06 | reverse DNS, HTTPS/HTTP probes | `.ts.net` name by `dns.reverse`; tailnet HTTP reaches nodes on 29695, 8001, 8003 (E-24) | Tailscale detection without Tailscale commands | Linux, MagicDNS off (U-001) |
| E-20 | `route -n get default`, `arp -n <gw>` (macOS, no sudo) | Gateway hardware address readable | Local network ID = hash of the gateway's hardware address (DEC-020) | Linux `/proc/net/route`+`/proc/net/arp` read, not run (U-005) |
| E-21 | `os.networkInterfaces()` on macOS | Tailscale on `utun5`, `100.64/10`, no hardware address; Wi-Fi `en0` with one | VPN = private IPv4 on an interface without a hardware address; local network = with one | Linux bridges (`docker0`, `br-*`) have one: excluded by name |
| E-22 | `scutil --get ComputerName` | Readable | DEC-016 computer name | — |
| E-23 | grep readers of `serverName`, `address-candidates`, server-addressing | Listed in Change Scope | Removals and derived consumers | — |
| E-25 | `remote-access-settings-service.ts:17-28` | Replaces the whole settings object | Allowed networks in their own file, not in settings | — |
| E-26 | `remote-access-route-policy.ts:77-86` | Owner routes are listed by path | New owner routes added there | — |
| E-27 | `types/node.ts:5` (`NodeType = 'embedded' \| 'remote'`) | No Docker node type | Local container detected as `runsInContainer` + loopback base URL | — |

## Intended Change

One node-side owner reports this computer's network facts. A desktop-side composer turns them, plus the node's port, into the four ways to connect and checks each address against the node's ID. The panel shows the ways as tabs and makes a code for the chosen way. The pairing contract keeps its one-address QR. On the phone, the app connects on scan without questions, keeps each node's name, and opens its node list from inside a page through a small bridge.

## Change Scope (Mandatory)

- **In scope:** UC-001…UC-008. Areas:
  - server `remote-access` (network facts, allowed local networks, pairing session way and discard, device way, status, routes, route policy);
  - desktop web (Phone Setup panel, phone access store, way composer, Tailscale command text, i18n);
  - `/mobile` web (pairing page, session name, connection sheet);
  - Android app (start screen and node list, scanner, connecting flow, bridge, input resolution, names, texts);
  - docs `remote_access.md`, `GLOSSARY.md`.
- **Derived consumers:**
  - `RemoteAccessStatus` without `serverName`: Android `ConnectionValidator`, `MainActivity` and the disabled message use the entry's name; `/mobile` `MobilePairedShell` uses the session's node name. iOS `ConnectionValidator.swift` decodes it with a default and stays unchanged (out of scope, FU-001).
  - The pairing session gains `connectionWay`, which the device record carries. The desktop phones list shows it. `/rest/remote-access/devices` and `/devices/revoked` summaries gain it.
  - Address candidates removed: only `phoneAccessStore` read the route.
- **Deliberately left alone:**
  - `server-addressing/server-address-candidate-service.ts`, still used by Memory Sync and Remote Collaboration; its private-IP helpers duplicate the new ranges file (FU-003).
  - Least-privilege phone authorization and the credential in page storage (future tickets).
  - iOS (FU-001).
  - One node at two addresses (FU-002).
  - 277's run list and run screens.
  - Remote Collaboration and peers on the desktop.
- **Follow-ups:** FU-001, FU-002, FU-003.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | Requirement / AC | Trigger | Existing (evidence) | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…005, 008, 015, 020…023; AC-001…003, 006, 013 | Phone Setup in the desktop node's window | E-01…E-03 | Tabs from detected ways; code per way | DS-001, DS-003 |
| BEH-002 | User | REQ-006; AC-004 | Same in a local Docker node's window | E-04, E-05 | Host facts + node port | DS-002, DS-003 |
| BEH-003 | User | REQ-007; AC-005 | Same in a remote node's window | E-02 | Its own facts, or its desktop address | DS-001, DS-003 |
| BEH-004 | User | REQ-010, 018; AC-007, 008, 015 | App Scan / browser link | E-09, E-13 | Connect without questions; browser one tap | DS-004, DS-005 |
| BEH-005 | User | REQ-011…013, 019; AC-009…011, 016 | App start, node sheet | E-10…E-12 | Names from the QR; scan-first list; Switch node | DS-004, DS-006 |
| BEH-006 | User | REQ-014; AC-012 | Phones list | E-15 | Way per phone; history | DS-007 |
| BEH-007 | Contract | REQ-016, 017; AC-007, 014 | Existing pairings | E-11, E-15 | Unchanged payload; additive fields | all |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| UI/UX spec + VIS-001…034 | Normative UI | REQ-001…023 | Every surface below renders it | Approved by the user |
| [product-design-request.md](product-design-request.md) | Brief | — | Context | Sent |
| [follow-ups.md](follow-ups.md) | FU-001…003 | — | Out of scope | — |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature with replacement).
- Current design issue found: `Yes`.
- **Structural triggers that fire:**
  - **Several kinds or forms:** the way composer serves three node kinds (desktop node, local Docker node, remote node) and four ways; each is traced in DS-001…DS-003.
  - **Derived data:** status `serverName` feeds three readers (E-23).
  - **Vocabulary drift:**
    - `serverName: "AutoByteus Desktop"` is a constant posing as a node's name;
    - "candidate" vs "way";
    - `serverName` in the payload is the node's display name, but the field and the status field share the name.
  - **Legacy cleanup:** the guide card and the candidates route.
  - **Persisted-data transition:** new fields and file.
  - **Split sequence:** avoided; the Android connect sequence has one owner (`NodeConnectionFlow`).
  - **Capability-area reuse:** `runs-in-container.ts`, the pairing service, `phoneAccessRemoteNode.fetchRemoteAccessStatusFromBaseUrl`.
- Root cause classification: `Boundary Or Ownership Issue`.
  - Address knowledge sits in the wrong place: a node in a container reports addresses it cannot know, and the page asks the user to supply them.
  - Also `Shared Structure Looseness`: the status `serverName` constant.
- Refactor needed now: `Yes`.
  - The address list is replaced by one network-facts owner per computer plus one composer on the desktop.
  - The two Phone Setup cards and their store logic are replaced.
  - `ConnectionScreen.kt` (234 lines) is replaced by split screens.
  - `MainActivity.kt` (252 lines) gives the connect sequence to `NodeConnectionFlow`.
- Evidence: E-02…E-05, E-10, E-12, E-23.
- Design response: below.
- Deferrals: the duplicate IP helpers in server-addressing (FU-003): untouched code that this change doesn't need to grow.

## Terminology

| Word | Meaning | Where |
| --- | --- | --- |
| **Way to connect** (`connectionWay`) | How a phone reaches a node: `company_address`, `tailscale`, `vpn`, `local_network` | UI tabs, store, pairing session, device record |
| **Node network** (`NodeNetwork`) | One node's report of the network of the computer it runs on: computer name, whether it runs in a container, its configured address, Tailscale, VPN addresses, local network | Server owner, REST, web types |
| **Local network** | The Wi-Fi or LAN this computer is on, recognised by its **network ID** (`networkId`: `gw_<hash>` from the router's hardware address, or `this-computer` when it cannot be recognised) | Server, store |
| **Allowed local network** | A local network the user allowed for phones ("Allow and show QR code") | `allowed-local-networks.json` |
| **Phone access** | The per-node on/off (existing `phoneAccessEnabled`) | Unchanged |
| **Shell bridge** | The Android app's `AutoByteusShell` object in its WebView | Android, `/mobile` |

`GLOSSARY.md` (Nodes) gets: Way to connect, Node network, Local network / network ID, Allowed local network, Shell bridge. "Address candidate" leaves the Phone Access vocabulary; Memory Sync and Remote Collaboration keep their own.

## Legacy Removal Policy (Mandatory)

- Obsolete paths:
  - `/rest/remote-access/address-candidates`, `address-candidate-service.ts`;
  - `PhoneSetupGuideCard.vue`, `PhoneAccessCard.vue`, `phoneSetupGuideCommands.ts`, `phoneAccessPairingUrlPolicy.ts` and their specs and i18n keys;
  - the store's candidate, manual-URL and acknowledgement state;
  - status `serverName`;
  - Android `ConnectionScreen.kt` form, HTTP checkbox on the start screen, "Open Tailscale" and "Recommended setup" on the start screen;
  - `MobileConnectionSheet` peers;
  - `MobilePairingBootstrap` device-name field and "Troubleshoot connection".
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Subjects:
  1. Node: new `remote-access/allowed-local-networks.json` `{ networkIds: string[] }` (a handful of entries).
  2. Node: `remote-access/paired-devices.json` rows gain optional `connectionWay` (1 active + 31 revoked on the user's node).
  3. `/mobile` page `localStorage` session gains optional `nodeName`.
  4. Android `saved_nodes` entries are unchanged in shape; `displayName` is now written from the QR.
- Reader/writer behavior:
  - JSON stores read with defaults (`readJsonFile` with defaults).
  - `paired-device-store` maps records. An absent `connectionWay` reads as `null`, and the phones list then omits "Connects through …" for that phone.
  - The page session guard (`mobileCredentialStorage.isMobileNodeSession`) ignores extra fields. An absent `nodeName` shows the address's host name.
  - Android `SavedNodeStore.toEntry` is unchanged.
- Decision: `Directly Usable — No Migration` for 2, 3 and 4; `Not Affected` for 1 (new file, absent = none allowed).
- Rationale: additive optional fields; no meaning changes; no old shape to transform. Existing saved entries named "AutoByteus Desktop" keep that name until the node is scanned again; the user re-scans to rename (acceptable; nothing is lost).
- Data Migration Guideline checklist: no schema version; no reused field name; tolerant readers; no startup gate.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001, 003 | Phone Setup opens (desktop or remote window) | Tabs with ready ways and Recommended | `phoneAccessStore` | Detection → ways |
| DS-002 | Primary | BEH-002 | Phone Setup opens in a local Docker node's window | Same | `phoneAccessStore` | Host facts come from the embedded node |
| DS-003 | Primary | BEH-001…003 | "Show QR code" / "Allow and show QR code" | QR with timer | `phoneAccessStore` → node `RemoteAccessPairingService` | Code per way |
| DS-004 | Primary | BEH-004, 005 | App Scan / node row tap | Node page paired / Can't reach | Android `NodeConnectionFlow` | Connect without questions |
| DS-005 | Primary | BEH-004 | Page loaded with `?pairing=` | Session saved, run list | `/mobile` `mobileNodeSessionStore` | Exchange in the page's origin |
| DS-006 | Primary | BEH-005 | Node sheet › Switch node | App's node list | Android `MainActivity` via bridge | Switch from inside |
| DS-007 | Primary | BEH-006 | Revoke / Revoke all / History | Lists updated | `phoneAccessStore` → `PairedDeviceService` | Unchanged semantics, way shown |
| DS-008 | Bounded local | BEH-001 | `NodeNetworkService.getNodeNetwork()` | `NodeNetwork` | `NodeNetworkService` | Interfaces → facts |

## Primary Execution Spine(s)

- DS-001: `PhonesPanel (mount) -> phoneAccessStore.load -> node GET /rest/remote-access/network + /status + /settings + /devices -> NodeNetworkService -> phoneConnectionWays.compose (candidates per way) -> address check (GET <candidate>/rest/remote-access/status, nodeId match) -> ways with readiness -> PhonesPanel tabs`
- DS-002: `PhonesPanel -> phoneAccessStore.load -> Docker node GET /network (runsInContainer: true) -> embedded node GET /network (host facts) -> phoneConnectionWays.compose(host facts, Docker node's port) -> address check against the Docker node's nodeId -> tabs (or "isn't reachable from other devices")`
- DS-003: `PhoneWayTab "Show QR code" -> phoneAccessStore.showCode(way) -> [PUT /settings phoneAccessEnabled=true when off] -> [PUT <facts owner>/network/local-networks/:networkId allowed=true when first time] -> POST /pairing-sessions {serverBaseUrl, serverName, connectionWay, trustedPrivateHttpAcknowledged} -> RemoteAccessPairingService.createPairingSession -> validatePairingServerBaseUrl -> session in memory -> {payload, qrText} -> PhoneCodeBlock (QR, timer)`; Close / tab switch / New code / switch off → `DELETE /pairing-sessions/:pairingCode`.
- DS-004: `ScanScreen (decoded text) -> NodeConnectionFlow.connect(text) -> PairingLinkParser -> ConnectingScreen -> ConnectionValidator (status of the QR address) -> SavedNodeStore.saveEntry(name from QR) -> WebShell opens <address>/mobile?pairing=… -> page DS-005`; failure → `CantReachScreen(reason)`.
- DS-005: `MobilePairingBootstrap (pairing param) -> [in app: AutoByteusShell.deviceName(); auto] / [browser: "Connect to <node>"] -> mobileNodeSessionStore.pairWithPayload (POST <page origin>/rest/remote-access/pairing-exchanges) -> RemoteAccessPairingService.exchangePairingCode -> PairedDeviceService.createDevice(connectionWay) -> session {nodeName} saved -> run list`
- DS-006: `MobileConnectionSheet "Switch node" -> AutoByteusShell.showNodeList() -> MainActivity (UI thread) -> StartScreen in switch mode (current node marked) -> NodeConnectionFlow.open(entry)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | The panel loads the node's network facts and status. The composer builds each way's addresses with the node's port. Each address is checked in parallel (2 s timeout) for the same node ID. A way is ready when one address passes. The best ready way is pre-selected | Store, NodeNetworkService, composer, check | `phoneAccessStore` | Interface classifier, network ID, computer name |
| DS-002 | The Docker node says it runs in a container and its base URL is loopback, so it is on this computer. The store asks the embedded node for this computer's facts and composes them with the Docker node's published port. Checks compare with the Docker node's ID. None passing while the host has ways gives "isn't reachable from other devices" | Same + embedded node | `phoneAccessStore` | — |
| DS-003 | The button turns phone access on if needed, records the allowed local network on the computer that owns it when first asked, then creates a session for the way's best checked address. Closing or changing discards it on the node | Store, pairing service | `phoneAccessStore` (desktop), `RemoteAccessPairingService` (node) | URL policy |
| DS-004 | The app parses the QR and checks the address answers. It saves the entry under the QR's name and opens the page with the pairing link. If nothing answers it shows the plain reason | Flow, parser, validator, store | `NodeConnectionFlow` | Diagnostic mapper |
| DS-005 | The page exchanges the code against its own origin. In the app it uses the bridge's device name, with no tap. In a browser, one tap | Bootstrap, session store, pairing service | `mobileNodeSessionStore` | Shell bridge client |
| DS-006 | The page asks the app to show its node list. The app shows it with the current node marked. A tap connects through DS-004 without a pairing link | Sheet, bridge, activity, flow | `MainActivity` | — |
| DS-007 | Unchanged routes; rows show the way | Store, device service | `PairedDeviceService` | — |
| DS-008 | Interfaces → classify (Tailscale, VPN, local, excluded) → Tailscale DNS name by reverse lookup → local network ID → allowed flag → configured address → computer name | — | `NodeNetworkService` | Classifier, identity, name |

## Spine Actors / Main-Line Nodes

- Desktop: `PhonesPanel` (view), `phoneAccessStore`, `phoneConnectionWays` (pure policy).
- Node: `NodeNetworkService`, `RemoteAccessPairingService`, `PairedDeviceService`.
- Page: `MobilePairingBootstrap`, `mobileNodeSessionStore`, `MobileConnectionSheet`.
- Android: `MainActivity` (screens), `NodeConnectionFlow`, `ShellBridge`.

## Ownership Map

| Node | Owns |
| --- | --- |
| `NodeNetworkService` (server) | This computer's network facts as one node sees them; the allowed local networks of this computer (read/write). It runs no Tailscale command and makes no network change |
| `phoneConnectionWays` (web, pure) | The way policy: which facts make which way, the order (company address, Tailscale, VPN, local network), address building with the node's port, readiness from checks, Recommended, blocked reason, the HTTP acknowledgement each way carries (Tailscale, VPN, company: yes; local network: only when allowed) |
| `phoneAccessStore` (web) | DS-001…003, DS-007 sequencing: load, check, tab state, code lifecycle (create, timer, discard), phone access switch, allow/forget network, devices |
| `RemoteAccessPairingService` (server) | Sessions: create with way, discard by code, discard all when phone access turns off, exchange (unchanged checks), device creation with the session's way |
| `PairedDeviceService` (server) | Devices; stores `connectionWay` |
| `mobileNodeSessionStore` (page) | Exchange against its origin; session with `nodeName` |
| `NodeConnectionFlow` (Android) | The connect sequence: parse → check → save → open; reasons |
| `ShellBridge` (Android) | The four bridge methods; nothing else |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| `api/rest/remote-access.ts` routes | The services above | HTTP boundary | Policy, classification |
| `PhonesPanel.vue` and its tab components | `phoneAccessStore` | Rendering | Way policy, requests |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Only the removed route uses it (E-23) | `NodeNetworkService` | server-addressing stays |
| Route `GET /rest/remote-access/address-candidates` and its route-policy entry | Only `phoneAccessStore` called it | `GET /rest/remote-access/network` | — |
| Status field `serverName` | A constant posing as a name (E-10) | Name from the QR (`serverName` in the payload, from the desktop's registry, DEC-016) | Readers listed in Change Scope |
| `RemoteAccessUrlCandidate`, `RemoteAccessUrlCandidateKind` types (server `models.ts:31-39`; web `types/remoteAccess.ts`) | No reader after the route goes | `NodeNetwork`, `ConnectionWay` | — |
| `autobyteus-web/components/settings/PhoneSetupGuideCard.vue`, `PhoneAccessCard.vue` + their specs | Replaced by the panel | `components/settings/phone/*` | — |
| `autobyteus-web/utils/phoneSetupGuideCommands.ts` + spec | Guide removed | `utils/phoneAccess/tailscaleServeCommand.ts` | No `serve reset` |
| `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts` + spec | No user-chosen URL to pre-validate; the node's policy decides; a typed company address shows the node's message | Node `pairing-url-policy.ts` | Implementation confirms no other importer |
| i18n keys `settings.components.settings.PhoneAccessCard.*`, `PhoneSetupGuideCard.*` (en, zh-CN) | Dead after the cards go | New `settings.components.settings.phone.*` | — |
| `MobileConnectionSheet` peers section and its two store imports | REQ-019 | — | The stores stay (other users, E-23) |
| `MobilePairingBootstrap` device-name field, "Troubleshoot connection" | Bridge device name; spec | Spec page | — |
| `MobilePairedShell.vue:126` status-name watch | `serverName` removed | Session `nodeName` | — |
| Android `ui/ConnectionScreen.kt` | Replaced by the spec's screens | `ui/start/*`, `ui/connect/*`, `ui/sheets/*` | — |
| Android `QrScanCoordinator`'s `CaptureActivity` launcher | Spec scanner screen | `ui/connect/ScanScreen.kt` with journeyapps `DecoratedBarcodeView` (same dependency, same permission) | Permission flow kept |
| Android `MainActivity` connect logic (`submitInput`, `validateAndOpen`, `openReachableEntry`) | Owner moves | `shell/NodeConnectionFlow.kt` | — |
| Android status `serverName` in `RemoteAccessStatus` | Field removed | Entry name | — |

## Return Or Event Spine(s) (If Applicable)

- Code expiry: `PhoneCodeBlock timer (1 s) -> 0:00 -> store marks expired` (no request; the node expires it on its own).
- Phone access off: `RemoteAccessSettingsService.onSettingsChanged(disabled) -> RemoteAccessPairingService discards all sessions`.

## Bounded Local / Internal Spines (If Applicable)

- DS-008 in `NodeNetworkService`: `os.networkInterfaces() -> classify each IPv4 (excluded / tailscale / vpn / local) -> dns.reverse(tailscale address) -> localNetworkId() -> allowed store read -> configured base URL check -> computerName()`.
- Code lifecycle in `phoneAccessStore`: `none -> creating -> shown(timer) -> expired | discarded`.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `network-interface-classifier.ts` | DS-008 | `NodeNetworkService` | Pure rules (below) | Testable without a machine | Rules mixed with I/O |
| `local-network-identity.ts` | DS-008 | `NodeNetworkService` | Gateway hardware address → `gw_<sha256 first 16 hex>`; macOS `route -n get default` + `arp -n` (`execFile`, 1 s timeout); Linux `/proc/net/route` + `/proc/net/arp`; otherwise or on failure `this-computer` | Per-OS detail | — |
| `computer-name.ts` | DS-008 | `NodeNetworkService` | macOS `scutil --get ComputerName`; else `os.hostname()` without `.local` | DEC-016 | — |
| `ip-address-ranges.ts` | DS-008, DS-003 | Classifier, URL policy | IPv4 parse, private ranges, Tailscale range, link-local | One copy in remote-access (pairing-url-policy imports it) | — |
| `allowed-local-network-store.ts` | DS-003 | `NodeNetworkService` | JSON file | Persistence | — |
| `tailscaleServeCommand.ts` (web) | DS-001 | Tailscale tab | The optional command per OS and port | Text only | — |
| Shell bridge client (`utils/remoteAccess/shellBridge.ts`, web) | DS-005, DS-006 | Page | Typed access to `window.AutoByteusShell`; `null` in a browser | One place knows the bridge | — |
| `ConnectionDiagnosticMapper.kt` | DS-004 | Flow | Spec reasons | Exists | — |

**Classifier rules** (IPv4 only; IPv6 never offered):

1. Excluded: internal; link-local `169.254/16`; public; names starting `docker`, `br-`, `veth`, `virbr`, `vmnet`, `vboxnet`, `cni`, `flannel`, `bridge`, `awdl`, `llw`, `anpi`.
2. Tailscale: in `100.64.0.0/10` and (no hardware address, or name `tailscale*`). The DNS name is the reverse name when it ends in `.ts.net`, else `null`.
3. VPN: private (`10/8`, `172.16/12`, `192.168/16`) with no hardware address.
4. Local network: private with a hardware address.

Anything else is excluded. A `100.64/10` address with a hardware address is carrier-grade NAT and is excluded.

## Ownership Boundaries

- **The node owns facts about its own computer; the desktop owns the policy that makes ways out of them.** The node never decides which way is recommended. The desktop never reads interfaces.
- **The allowed-network answer is kept by the node whose network it is:** the embedded node for the desktop node and local Docker nodes; the remote node for itself.
- **The pairing service stays the single owner of codes;** the store only asks it.
- **The page keeps the credential.** The app holds no credential, and the bridge carries none.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `NodeNetworkService` | classifier, identity, name, allowed store | REST routes | Routes reading the store or interfaces | Add a service method |
| `RemoteAccessPairingService` | sessions map, URL policy | REST routes | Routes touching sessions | Add a method |
| `phoneAccessStore` | `phoneConnectionWays`, requests | Panel components | Components calling `apiService` or the composer | Store action |
| `NodeConnectionFlow` | parser, validator, saved store writes | `MainActivity`, bridge actions | Activity validating or saving itself | Flow method |

## Dependency Rules

- Web components → store → composer (pure) and `apiService` / `fetchRemoteAccessStatusFromBaseUrl`. The composer imports types only.
- Server routes → services → stores and off-spine files. `remote-access` may import `server-addressing/runs-in-container.ts`. `server-addressing` must not import `remote-access`.
- Page → shell bridge client → `window.AutoByteusShell`. No other page code touches `window.AutoByteusShell`.
- Android `ShellBridge` → `MainActivity` callbacks only (posted to the UI thread). The bridge never reads saved entries' data beyond their count.
- Forbidden: the desktop sending `trustedPrivateHttpAcknowledged: true` for a `local_network` way whose network is not allowed; the app adding the HTTP acknowledgement for typed input (only for parsed pairing payloads).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `GET /rest/remote-access/network` (owner) | This node's computer network | Returns `NodeNetwork` | — | Container: `tailscale: null, vpnAddresses: [], localNetwork: null` |
| `PUT /rest/remote-access/network/local-networks/:networkId` (owner) body `{ allowed: boolean }` | One local network of this computer | Allow / forget | `networkId` (`gw_…` or `this-computer`) | 400 for another shape |
| `POST /rest/remote-access/pairing-sessions` (owner) body adds `connectionWay` (required, one of four) | A new code | Unchanged otherwise | — | 400 `REMOTE_ACCESS_PAIRING_WAY_INVALID` |
| `DELETE /rest/remote-access/pairing-sessions/:pairingCode` (owner) | One open code | Discard | `pairingCode` | 204 even when unknown |
| `GET /rest/remote-access/status` (public) | Node status | Drops `serverName` | — | `nodeId`, `phoneAccessEnabled`, `pairingAvailable` stay |
| `PairedDeviceSummary.connectionWay: ConnectionWay \| null` | Device | Display | — | — |
| QR payload | Pairing | **Unchanged** `{version:1, serverBaseUrl, pairingCode, expiresAt, serverName}` | — | `serverName` = the desktop's name for the node (DEC-016) |
| `window.AutoByteusShell` (Android, `@JavascriptInterface`) | The app | `nodeCount(): Int`, `deviceName(): String` (`Build.MODEL`), `showNodeList()`, `startScan()` | — | No credential, no entry data |

```ts
type ConnectionWay = 'company_address' | 'tailscale' | 'vpn' | 'local_network';
type NodeNetwork = {
  computerName: string;
  runsInContainer: boolean;
  configuredBaseUrl: string | null;        // AUTOBYTEUS_SERVER_HOST, null when loopback or in a container
  tailscale: { address: string; dnsName: string | null } | null;
  vpnAddresses: string[];
  localNetwork: { networkId: string; addresses: string[]; allowed: boolean } | null;
};
```

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `/network` | Yes | Yes | Low | — |
| `/network/local-networks/:networkId` | Yes | Yes | Low | — |
| `DELETE /pairing-sessions/:pairingCode` | Yes | Yes | Low | — |
| Shell bridge | Yes (app shell actions) | N/A | Low | Four methods only |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Way to connect | `connectionWay` / "way" | Yes | Yes (tabs, session, device) | Low | Glossary |
| Node network | `NodeNetwork` | Yes | Yes | Low | Glossary |
| Local network ID | `networkId` | Yes | Yes | Low | Glossary |
| Payload `serverName` | Kept (wire, unchanged) | Yes: the node's display name | After the status field is removed, one meaning | Low | — |
| Status `serverName` | Removed | — | — | — | Removal |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| In-container check | `server-addressing/runs-in-container.ts` | Reuse | Same fact |
| Interface listing | server-addressing candidates | Not reused | Wrong subject (peer and Memory Sync addresses with port, no kinds); left alone |
| Address check by node ID | `utils/phoneAccessRemoteNode.ts` `fetchRemoteAccessStatusFromBaseUrl` | Reuse (add `AbortSignal` timeout) | Exists |
| QR image | `services/qr/qrCodeDataUrlService.ts` | Reuse | Exists |
| Scanner | journeyapps zxing (dependency held) | Extend (own layout) | No new dependency/permission |
| JSON file stores | `persistence/file/store-utils.ts` | Reuse | Pattern |
| Settings events | `RemoteAccessSettingsService.onSettingsChanged` | Reuse | Discard on disable |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Server `remote-access` | Network facts, allowed networks, sessions, devices, routes | DS-001…003, 005, 007, 008 | Extend |
| Web `stores` + `utils/phoneAccess` + `components/settings/phone` | Panel, way policy, code lifecycle | DS-001…003, 007 | Replace |
| Web `components/mobile`, `stores/mobileNodeSessionStore`, `utils/remoteAccess` | Pairing page, session name, sheet, bridge client | DS-005, 006 | Extend |
| Android `shell`, `ui`, `web`, `connection` | Screens, flow, bridge | DS-004, 006 | Extend / Replace |

## Draft File Responsibility Mapping

Drafted, then tightened; final below.

## Reusable Owned Structures Check

| Repeated | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| IPv4 ranges (pairing-url-policy, classifier) | `remote-access/services/ip-address-ranges.ts` | remote-access | Two users in one subsystem | Yes | Yes | A general networking util |
| `ConnectionWay`, `NodeNetwork` types | server `remote-access/domain/models.ts`; web `types/remoteAccess.ts` | each side | Wire types | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `NodeNetwork` | Yes | Yes (no port, no URLs: the desktop builds them) | Low | — |
| Pairing session (`+connectionWay`) | Yes | Yes | Low | — |
| `PairedDeviceRecord` (`+connectionWay`) | Yes | Yes | Low | — |
| Page session (`+nodeName`) | Yes | Yes | Low | — |

## Final File Responsibility Mapping

See Target Mapping (one table, to avoid two lists).

## Applied Patterns (If Any)

- Strategy-free pure policy module (`phoneConnectionWays`); repository-style JSON store; adapter (`ShellBridge`) between WebView JS and the activity; small state machine for the code lifecycle in the store.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/node-network-service.ts` | Add | `NodeNetworkService` | `getNodeNetwork()`, `setLocalNetworkAllowed(networkId, allowed)` | Way policy |
| `…/remote-access/services/network-interface-classifier.ts` | Add | off-spine | Pure rules above | I/O |
| `…/remote-access/services/local-network-identity.ts` | Add | off-spine | Network ID per OS | — |
| `…/remote-access/services/computer-name.ts` | Add | off-spine | Computer name | — |
| `…/remote-access/services/ip-address-ranges.ts` | Add | off-spine | IPv4 helpers | — |
| `…/remote-access/stores/allowed-local-network-store.ts` | Add | store | `allowed-local-networks.json` | — |
| `…/remote-access/services/pairing-url-policy.ts` | Modify | URL policy | Import ranges; rules unchanged | — |
| `…/remote-access/services/remote-access-pairing-service.ts` | Modify | sessions | `connectionWay`; `discardSession(code)`; discard all on disable (subscribe in constructor) | — |
| `…/remote-access/services/paired-device-service.ts`, `stores/paired-device-store.ts` | Modify | devices | `connectionWay` | — |
| `…/remote-access/domain/models.ts` | Modify | types | `ConnectionWay`, `NodeNetwork`; remove candidate types; session/device fields; error code `REMOTE_ACCESS_PAIRING_WAY_INVALID` | — |
| `…/remote-access/services/address-candidate-service.ts` | Remove | — | — | — |
| `…/api/rest/remote-access.ts` | Modify | routes | Status without `serverName`; `/network`, `/network/local-networks/:networkId`, `DELETE /pairing-sessions/:pairingCode`; drop `/address-candidates` | — |
| `…/api/security/remote-access-route-policy.ts` | Modify | policy | Owner class for the new paths (`/rest/remote-access/network`, `^/rest/remote-access/network/local-networks/[^/]+$`, `^/rest/remote-access/pairing-sessions/[^/]+$`); drop candidates | — |
| `autobyteus-server-ts/docs/features/remote_access.md` | Modify | docs | Routes, network facts, ways, discard | — |
| `autobyteus-web/types/remoteAccess.ts` | Modify | types | `ConnectionWay`, `NodeNetwork`, device way; remove candidate types and status `serverName`; session `nodeName` | — |
| `autobyteus-web/utils/phoneAccess/phoneConnectionWays.ts` | Add | policy | Compose ways (see example) | Requests |
| `autobyteus-web/utils/phoneAccess/tailscaleServeCommand.ts` | Add | text | `<tailscale> serve --bg <port>` for the embedded node (HTTPS 443); `--bg --https=<port+10000> <port>` for others; macOS path `/Applications/Tailscale.app/Contents/MacOS/Tailscale`, else `tailscale` | `serve reset` |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Modify | check | Timeout signal | — |
| `autobyteus-web/stores/phoneAccessStore.ts` | Replace | `phoneAccessStore` | DS-001…003, 007 | Way rules |
| `autobyteus-web/components/settings/phone/PhonesPanel.vue` | Add | view | Header switch, blocked message, tabs (WAI-ARIA), phones | — |
| `…/phone/PhoneWayTab.vue` | Add | view | Status, buttons, local-network card/row, company field, How it works, Advanced | — |
| `…/phone/PhoneCodeBlock.vue` | Add | view | QR, result line, timer, Close/New code, footnote, About | — |
| `…/phone/ConnectedPhones.vue` | Add | view | Rows, Revoke, Revoke all confirm, History | — |
| `autobyteus-web/components/settings/NodeManager.vue` | Modify | view | Mount `PhonesPanel` | — |
| Removed web files | Remove | — | Listed in Removal Plan | — |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Modify | i18n | New keys; old removed | — |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` | Add | bridge client | `getShellBridge(): ShellBridge \| null` | — |
| `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` | Modify | page | Spec page; auto-pair in app; Connecting/Connected/expired/used states in the app with "Scan again" → `startScan()` | — |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | Modify | session | Pair against the page's own origin; save `nodeName`; parse `?pairing=` | — |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` | Modify | page | Node name from session (host fallback) | — |
| `autobyteus-web/components/mobile/connection/MobileConnectionSheet.vue` | Modify | page | Spec sheet; Switch node row when bridge present; "Unpair from <node>" (DEC-018) | Peers |
| `autobyteus-android/.../shell/NodeConnectionFlow.kt` | Add | flow | DS-004 | Views |
| `…/web/ShellBridge.kt` | Add | bridge | Four `@JavascriptInterface` methods | Credentials |
| `…/web/AutoByteusWebView.kt` | Modify | WebView | Register bridge | — |
| `…/ui/start/StartScreen.kt`, `NodeRow.kt` | Add | view | Start screen and Switch node mode (VIS-018…021, 028, 034) | — |
| `…/ui/connect/ScanScreen.kt`, `ConnectingScreen.kt`, `CantReachScreen.kt` | Add | view | VIS-024…027 | — |
| `…/ui/sheets/TypeAddressSheet.kt`, `RemoveNodeSheet.kt` | Add | view | VIS-022, 023 (DEC-017 text) | — |
| `…/ui/ConnectionScreen.kt` | Remove | — | — | — |
| `…/MainActivity.kt` | Modify | activity | Screen switching; delegates to the flow | Connect logic |
| `…/shell/ConnectionInputResolver.kt`, `QrScanCoordinator.kt` | Modify | input, permission | Pairing payload = acknowledged; typed HTTP needs the sheet's tick; scanner launch → ScanScreen | — |
| `…/connection/ConnectionValidator.kt`, `ConnectionDiagnosticMapper.kt` | Modify | check, texts | No `serverName`; spec reasons | — |
| `GLOSSARY.md` | Modify | vocabulary | Terms above | — |

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `remote-access/services` | Mixed justified | Yes | Low | Existing layout: services and pure helpers side by side |
| `components/settings/phone/` | View | Yes | Low | New folder groups four panel files |
| `utils/phoneAccess/` | Off-spine | Yes | Low | Policy + text |
| Android `ui/start`, `ui/connect`, `ui/sheets` | View | Yes | Low | Splits the old screen |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Way composition (local Docker node on port 8001, host with Tailscale and Wi-Fi) | `compose({ target: dockerNetwork, host: embeddedNetwork, port: 8001 })` → `tailscale: ['https://<dns>:18001', 'http://100.x.y.z:8001']`, `local_network: ['http://192.168.1.20:8001']`; each checked against the Docker node's `nodeId`; first passing address per way is used | The Docker node listing its own `172.17.x.x` addresses | Facts belong to the computer, the port to the node |
| HTTP acknowledgement | `tailscale`, `vpn`, typed company address → `true`; `local_network` → `true` only when `localNetwork.allowed` (or pressed now) | A checkbox, or `true` for an un-allowed network | Trust stays explicit for local networks |
| Bridge | `getShellBridge()?.showNodeList()` | Reading saved entries or credentials through the bridge | Minimal surface |
| Android scan | `ConnectionInputResolver`: parsed pairing payload → acknowledged; plain typed `http://` → needs the sheet's tick | Asking again after a scan | REQ-010 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `/address-candidates` alongside `/network` | Old desktop windows | Rejected (DESIGN.md rule 9) | Removed |
| Keep status `serverName` for old apps | Installed Android/iOS apps read it | Rejected; their readers default the field (Android `optString`, iOS `decodeIfPresent`) and the name comes from the QR | Removed |
| QR payload with an address list plus the old field | Fallback addresses | Rejected (DEC-019): one checked address per code | Payload unchanged |
| Second HTTP check on the phone for scanned codes | Old behavior | Rejected (REQ-010) | — |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. **Server.**
   - `ip-address-ranges.ts`, classifier, identity, computer name and allowed store, then `NodeNetworkService` and the routes.
   - Pairing session `connectionWay`, discard (route and on disable), device `connectionWay`, status without `serverName`.
   - Route policy; remove candidates; docs.
2. **Desktop web.** Types, composer and command text, store, panel components, `NodeManager`, i18n; remove the old cards, utils and specs. This stage works with the current Android app (QR unchanged) and can ship alone.
3. **`/mobile` web.** Bridge client, session `nodeName`, pairing page, sheet, paired shell name.
4. **Android.** Bridge, flow, screens, input resolver, validator, mapper texts; remove `ConnectionScreen.kt`.
5. **Glossary; tests per TESTING.md.**

## Key Tradeoffs

- **One address per code (DEC-019)** over an address list: simpler contract and no payload change. A phone without MagicDNS could miss the Tailscale HTTPS name, so the check prefers the HTTPS name only when it passed from the desktop; otherwise it uses the Tailscale IP.
- **The desktop composes ways, not the node:** only the desktop knows both a Docker node and its host. It costs a few parallel status checks (each ≤ 2 s) when the panel opens.
- **Allowed networks in their own file** rather than in settings: settings writes replace the whole object (E-25), and the subject differs.
- **A `@JavascriptInterface` bridge** over a custom URL scheme: one surface for detection, count, device name and actions. Any frame in the WebView could call it. The methods expose a node count and the phone model, and open screens. This is accepted and recorded.

## Risks

- U-001/U-004/U-005 on Linux (detection rules read, not run). Mitigation: the fallbacks (unrecognised → local network and asked; network ID `this-computer`); API/E2E runs the classifier with recorded Linux interface fixtures and one real Linux host check (Docker image host or CI runner).
- U-006: Tailscale Serve accepting `--https=<port+10000>`. Only the optional Advanced text depends on it. Implementation confirms from Tailscale docs; it does not run the command on the user's machine.
- U-003: desktop checks against other nodes' addresses under the Origin rule. A renderer `fetch` from `file://` or loopback is allowed by `remote-access-request-origin.ts`; implementation confirms on the packaged build.
- A spoofed bridge call from a page frame: harmless by design (above).

## Guidance For Implementation

- Reproduction to start from: `None` as a script. Failing checks to write first:
  - E-09: a scanned HTTP pairing link is refused (Android unit test on `ConnectionInputResolver`);
  - E-10: the saved name is overwritten by the status constant (Android unit test on the flow);
  - E-04: Docker node candidates (server unit test on the classifier with container interfaces).
- Do not touch the user's real nodes, Tailscale configuration or paired phones. Use isolated nodes; no real names, addresses or live codes in fixtures, logs or screenshots.
- Visible texts are the spec's, except DEC-016…DEC-018 (requirements doc).
