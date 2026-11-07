# Design Review Report — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Review Round Meta

- Upstream Requirements Doc: [requirements-doc.md](requirements-doc.md) (`Approved` SR-011; SR-012 technical edits DEC-019…DEC-021)
- Upstream Investigation Notes: [investigation-notes.md](investigation-notes.md) (E-01…E-27, U-001…U-005)
- Upstream Solution Revision Record: [solution-revision-record.md](solution-revision-record.md) (SR-001…SR-012a)
- Reviewed Design Spec: [design-spec.md](design-spec.md) (SR-012, status `Ready`, user approval `Obtained`)
- Supplemental Task Artifacts Reviewed: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-step-phone-pairing/ui-ux-spec.md` (Approved; VIS-001…034, UXJ-001…008, TR-001…018); [follow-ups.md](follow-ups.md); [product-design-request.md](product-design-request.md) (context only); [solution-handoff.md](solution-handoff.md)
- Relevant Solution Revision IDs: `SR-011`, `SR-012`, `SR-012a`
- Architecture Review Revision Record: [architecture-review-revision-record.md](architecture-review-revision-record.md)
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete, `Large` / `High`, from the Solution Designer (run `solution_designer_03f4f2aaf88941a0a3030151229dc1fa`), 2026-11-07
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`, branch `codex/one-step-phone-pairing`, head `4bd116d379` (docs only over base `origin/personal` @ `677f61de0b`). Code read by the reviewer: server `api/rest/remote-access.ts`, `api/security/{remote-access-route-policy,remote-access-request-origin,remote-access-policy-plugin,redact-sensitive-url,remote-access-local-trust}.ts`, `logging/http-access-log-policy.ts`, `remote-access/services/{remote-access-pairing-service,remote-access-settings-service,pairing-url-policy}.ts`, `remote-access/stores/paired-device-store.ts`, `docker/{entrypoint.sh,docker-compose.yml}`; web `stores/phoneAccessStore.ts`, `utils/phoneAccessRemoteNode.ts`, `stores/mobileNodeSessionStore.ts`, `types/node.ts`, `components/mobile/views/MobileFileViewer.vue`, `components/fileExplorer/viewers/HtmlPreviewer.vue`; Android `MainActivity.kt`, `shell/ConnectionInputResolver.kt`, `connection/{SavedNodeEntry,ConnectionValidator}.kt`, `web/AutoByteusWebView.kt`, `app/build.gradle*`; iOS `ConnectionValidator.swift`; `tickets/done/html-preview-isolation/requirements-doc.md` (autobyteus-417). Android platform documentation on JavaScript bridges (sources in Residual Risks).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three subsystems change together (server remote-access, desktop web, `/mobile` + Android); new owner routes; a native-to-page bridge; changed trust rules for HTTP; per-OS detection; a new persisted file and additive fields.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The user's approval of the design is recorded as `Obtained` (design-spec, Solution And Approval Basis).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for intent and current state. Target paths need correction where the findings say so.
- Approved requirements / intended behavior understood: Yes. On the desktop, four tabs (one per way to connect), the best ready way pre-selected, every address checked against the node ID, and one code per way. On the phone, scan and be connected, names from the QR, a scan-first list, and "Switch node" from the node sheet. Existing pairings keep working.
- Relevant existing behavior and evidence confirmed: Yes (cited lines opened; see the statements list below).
- Scope guardrail confirmed: Yes (UC-001…UC-008; Out of Scope; Preserved Behavior Boundary: BEH-007, REQ-016, the 403 Origin rule and phone route list, phone credentials cannot manage, HTTP refused for non-private hosts; Review Authority).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (see Findings; AR-001 also cites the established autobyteus-417 contract).
- Remaining material ambiguity: one product choice inside AR-006: whether a pairing link shared into the app from another app pairs at once (DEC-007 covers only scan and browser).
- Statements about existing code the design relies on, opened at their cited lines:
  - `api/rest/remote-access.ts:25-41` constant `serverName` — true.
  - `remote-access-pairing-service.ts:51-92` and `94-152` — true. Note: a consumed session is deleted at line 134, so a reused code returns `REMOTE_ACCESS_PAIRING_INVALID`, not `…_CONSUMED` (matters for AR-006).
  - `remote-access-settings-service.ts:17-28` replaces the settings object — true. `onSettingsChanged` exists (lines 28-31): reuse is sound.
  - `remote-access-route-policy.ts:77-86` owner routes listed by path — true. An unlisted `/rest/remote-access/*` path falls to `TRUSTED_NETWORK_PROTECTED` (line 100), which a phone credential can open, so listing the new paths (as designed) is required, not optional.
  - `phoneAccessStore.ts:115-135` and `165-190` — true. Today the embedded node's name is the constant `'AutoByteus Desktop'` (line 56).
  - U-003: `phoneAccessRemoteNode.ts:13-19` already fetches `/status` from arbitrary base URLs in the renderer. The Origin gate admits `file://` and loopback origins (`remote-access-request-origin.ts:64,76`), and CORS mirrors the same rule (`remote-access-policy-plugin.ts:61-65`). The desktop address check therefore reuses a working path; the remaining packaged-build confirmation is a residual risk.
  - Backward-Compatibility Rejection Log: "their readers default the field … and the name comes from the QR" — **inaccurate**. Android `ConnectionValidator.kt:57` defaults to `"AutoByteus Desktop"`, and `MainActivity.kt:185` then overwrites the QR name with it. iOS `ConnectionValidator.swift:30` behaves the same. Installed apps therefore keep showing "AutoByteus Desktop". This is no regression, but the stated rationale is wrong (AR-008).
  - Android `MainActivity.kt:155-194` saves the entry before the page exchanges the code. This is current behavior, relevant to AR-006.
  - The design's statement that `@JavascriptInterface` "any frame could call it" is true, and the phone page has such frames: `MobileFileViewer.vue` → `FileViewer` → `HtmlPreviewer.vue:8` (`sandbox="allow-scripts"`). See AR-001.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Fail | Needs Correction | AR-003 (Tailscale trust signal vs DEC-003), AR-004 (local address choice), AR-005 (discard logging), AR-007 (command port) |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | DS-002 is traced, including the embedded node lookup (`nodeStore` holds `EMBEDDED_ENTRY_ID` with its base URL) |
| BEH-003 | User | Pass | Pass | Fail | Needs Correction | AR-002 (the address the desktop reaches a remote node at, and the company address, are not traced into ways) |
| BEH-004 | User | Pass | Pass | Fail | Needs Correction | AR-006 (entry forms, failed exchange outcome) |
| BEH-005 | User | Pass | Pass | Fail | Needs Correction | AR-001 (bridge exposure), AR-006 (node-list reachability owner, app-start auto-open) |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Pass | Confirmed | Payload unchanged; additive fields; AR-008 corrects only the stated rationale |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec (Product, VIS-001…034) | Pass | Pass | Pass | Fail (minor) | Pass | AR-009: the spec's "Phone-facing addresses: several addresses; the first that answers wins" is superseded by DEC-019 without a note; its first-launch copy "choose Connect a phone" names a button the tabs no longer have |
| follow-ups.md | Pass | Pass | Pass | Pass | Pass | FU-001 text still says "address list in the QR" (superseded by DEC-019). Cosmetic |
| product-design-request.md | Pass | Pass | Pass | Pass (context only) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | design-spec "Task Design Health Assessment" | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue` (container node reports addresses it cannot know, E-04) plus `Shared Structure Looseness` (status `serverName` constant, E-10); confirmed in code | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes. Replace the candidate list with one facts owner and one desktop composer; split `ConnectionScreen.kt`; move the connect sequence to `NodeConnectionFlow`. FU-003 deferred | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Target Mapping, Removal Plan, Ownership Map | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Desktop/remote window → tabs | Pass | Fail | Pass | Pass | Pass | Pass | Fail (AR-002: the remote node's desktop address and company address paths are missing) |
| DS-002 | Docker window → tabs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Show QR code → QR | Pass | Pass | Pass | Pass | Pass | Pass | Pass (AR-005 changes the discard identity only) |
| DS-004 | App scan / row tap → page | Pass | Fail | N/A | Pass | Pass | Pass | Fail (AR-006: other entry forms and the failed-exchange return are not traced) |
| DS-005 | Page `?pairing=` → session | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Sheet › Switch node → list | Pass | Pass | N/A | Pass | Pass | Pass | Fail (AR-001: bridge reachable from preview frames) |
| DS-007 | Phones list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Bounded: interfaces → facts | Pass | Pass | N/A | Pass | Pass | Pass | Fail (AR-003 classifier vs DEC-003; AR-004 local address order) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `NodeNetworkService` | Pass | Pass | Pass | Pass | Routes call only the service |
| `RemoteAccessPairingService` | Pass | Pass | Pass | Pass | Sessions map stays private |
| `phoneAccessStore` | Pass | Pass | Pass | Pass | Components do not call `apiService` or the composer |
| `NodeConnectionFlow` | Pass | Pass | Pass | Pass | Activity delegates; bridge actions go through the activity |
| `ShellBridge` | Pass | Pass | Fail | Fail | AR-001: every frame can reach it, including opaque-origin preview frames |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web: components → store → composer / api | Pass | Pass | Pass | Pass | — |
| Server: routes → services → stores; `remote-access` → `server-addressing/runs-in-container` only | Pass | Pass | Pass | Pass | `server-addressing` must not import `remote-access` |
| Page → shell bridge client → `window.AutoByteusShell` | Pass | Pass | Pass | Pass | One client file |
| Android `ShellBridge` → activity callbacks on the UI thread | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET /rest/remote-access/network` | Pass | Pass | Pass | Low | Pass |
| `PUT /rest/remote-access/network/local-networks/:networkId` | Pass | Pass | Pass | Low | Pass |
| `POST /pairing-sessions` + `connectionWay` | Pass | Pass | Pass | Low | Pass |
| `DELETE /pairing-sessions/:pairingCode` | Pass | Pass | Fail | Low | Fail (AR-005: the live code is the path identity and is logged unredacted) |
| `GET /status` without `serverName` | Pass | Pass | Pass | Low | Pass |
| `window.AutoByteusShell` (4 methods) | Pass | Pass | N/A | Medium | Fail (AR-001: no caller-origin boundary) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| In-container fact | Pass | Pass | N/A | Pass | `runs-in-container.ts` |
| Address check by node ID | Pass | Pass | N/A | Pass | `fetchRemoteAccessStatusFromBaseUrl` + timeout |
| Settings events for discard on disable | Pass | Pass | N/A | Pass | `onSettingsChanged` exists |
| JSON file store | Pass | Pass | N/A | Pass | `store-utils.ts` `readJsonFile` with fallback |
| Interface listing (server-addressing) | Pass | Pass | Pass | Pass | Different subject; FU-003 records the duplicate ranges |
| Log redaction | Fail | Fail | N/A | Fail | AR-005: the new path parameter is not covered by `redact-sensitive-url.ts` (query keys only) |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server `remote-access` | Pass | Pass | Pass | Pass | — |
| Web `stores` / `utils/phoneAccess` / `components/settings/phone` | Fail | Pass | Pass | Fail | AR-008: who picks the node name for the QR (DEC-016: computer name for the embedded node, registry name otherwise) is not assigned |
| Web mobile + `utils/remoteAccess` | Pass | Pass | Pass | Pass | — |
| Android `shell` / `ui` / `web` / `connection` | Fail | Pass | Pass | Fail | AR-006: owner of node-list reachability checks ("Online / Not reachable / Checking…") unassigned; entry forms not traced |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| IPv4 ranges (URL policy + classifier) | Pass | Pass | Pass | Pass | `remote-access/services/ip-address-ranges.ts` |
| `ConnectionWay`, `NodeNetwork` wire types | Pass | Pass | Pass | Pass | One per side |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `NodeNetwork` | Fail | Pass | Pass | N/A | Fail | `configuredBaseUrl` "null when loopback or in a container" drops a configured company address on a Docker deployment (AR-002). `localNetwork.addresses` carries no order or primary marker (AR-004) |
| Pairing session / device `connectionWay` | Pass | Pass | Pass | N/A | Pass | — |
| Page session `nodeName` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass`. Status `serverName` readers (E-23, re-grepped by the reviewer) and the device summaries are listed. The rationale for installed apps is corrected under AR-008.

Each domain word keeps one meaning and each concept one name (Principle 15): `Pass` ("way to connect", "node network", "network ID", "allowed local network", "shell bridge"; GLOSSARY.md update planned).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server: `node-network-service.ts`, classifier, identity, computer name, ranges, allowed store | Pass | Pass | Pass | Pass | — |
| `remote-access-pairing-service.ts` (way, discard, discard on disable) | Pass | Pass | N/A | Pass | — |
| Web: `phoneConnectionWays.ts`, `tailscaleServeCommand.ts`, `phoneAccessStore.ts`, panel components | Pass | Pass | N/A | Pass | — |
| Web: `shellBridge.ts`, `MobilePairingBootstrap.vue`, `mobileNodeSessionStore.ts`, `MobileConnectionSheet.vue` | Pass | Pass | N/A | Pass | — |
| Android: `NodeConnectionFlow.kt`, `ShellBridge.kt`, screens, sheets | Pass | Pass | N/A | Pass | AR-001 may change the bridge mechanism, not the file's single concern |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remote-access/services/*` new files | Pass | Pass | Low | Pass | Existing layout |
| `components/settings/phone/` | Pass | Pass | Low | Pass | — |
| `utils/phoneAccess/` | Pass | Pass | Low | Pass | — |
| Android `ui/start`, `ui/connect`, `ui/sheets`, `shell/NodeConnectionFlow.kt`, `web/ShellBridge.kt` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `address-candidate-service.ts`, route, route-policy entry, candidate types | Pass | Pass | Pass | Pass | Importers re-grepped: only `api/rest/remote-access.ts` |
| Old cards, `phoneSetupGuideCommands.ts`, `phoneAccessPairingUrlPolicy.ts`, i18n keys | Pass | Pass | Pass | Pass | Importers re-grepped: only the store and the guide card |
| Status `serverName` (server, web type, Android field) | Pass | Pass | Pass | Pass | — |
| `ConnectionScreen.kt`, `CaptureActivity` launcher, `MainActivity` connect logic | Pass | Pass | Pass | Pass | — |
| `MobileConnectionSheet` peers, bootstrap device-name field | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| QR payload v1 | No (unchanged contract, not a wrapper) | Pass | Pass | REQ-017 |
| Status `serverName` | No | Pass | Pass | Removed; the rationale is corrected in AR-008 |
| Candidates route | No | Pass | Pass | Removed |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `allowed-local-networks.json` (new) | Not Affected (absent = none allowed) | Pass | Pass | N/A | Pass | — |
| `paired-devices.json` + `connectionWay` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | `paired-device-store.ts:10-31` validates required fields only and spreads the rest; absent → `null` |
| `/mobile` session + `nodeName` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Host fallback |
| Android `saved_nodes` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Shape unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server → desktop web → `/mobile` → Android → glossary | Pass | Pass (desktop stage ships alone with the current app; QR unchanged) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Way composition | Yes | Pass (Docker) / Fail (remote) | Pass | Fail | AR-002: add the remote-node example (own facts + the desktop's address; container remote) |
| HTTP acknowledgement per way | Yes | Pass | Pass | Pass | — |
| Bridge | Yes | Pass | Pass | Pass | Shape changes with AR-001 |
| Android scan acknowledgement | Yes | Pass | Pass | Pass | Extend to the other entry forms (AR-006) |

## Material Premise Validation (Only When Needed)

### P-001 — A previewed HTML page on the phone can call the shell bridge

- Related approved requirement or established contract: autobyteus-417 REQ-002 ("A previewed page cannot read or script the app window, cannot call the preload API, and cannot read the app's browser storage"), actor outcome "Preview works and cannot act as the app", SCN-004 (Supported Explicit Edge Scenario: hostile HTML previewed); this ticket's QR-003 / trusted private network constraint.
- Relevant behavior ID(s): BEH-005 (DS-006), BEH-004 (DS-005)
- Initiating basis kind: `User` + `Contract`
- Independent product-supported initiating trigger or applicable governing contract: in the Android app, the user opens a run's HTML artifact or workspace HTML file on a node page. That is 417 SCN-001/SCN-002 on the phone (`MobileFileViewer.vue` → `FileViewer` → `HtmlPreviewer.vue:8`, `sandbox="allow-scripts"`). The HTML was written by an agent, a cloned repository or a download. 417 SCN-004 is the governing contract that such HTML is treated as hostile.
- Support evidence: an exposed phone surface (Files / Artifacts views) and a supported user action (opening a preview). Android documents that `addJavascriptInterface` objects are available to every frame, including iframes, with no origin control.
- Forward path: the user opens the preview → the sandboxed iframe's scripts run → `window.AutoByteusShell` is present in that frame → the script calls `showNodeList()` / `startScan()` (the activity changes screen and opens the camera scanner) and reads `deviceName()` / `nodeCount()`.
- Lifecycle preconditions and material consequence: a preview is open on a paired node page in the app. Previewed content can drive the native app (navigate away from the node page, open the camera scanner) and read device facts. That is acting as the app, which 417 just closed for the desktop preload API and for phone storage. No credential is exposed.
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-001.

### P-002 — The local-network address put in the QR is a virtual adapter, not the Wi-Fi/cable address

- Related approved requirement: REQ-002 rank (4) "its local Wi-Fi/cable address"; REQ-003 (honest QR); AC-002.
- Relevant behavior ID(s): BEH-001 (also BEH-002 via host facts)
- Initiating basis kind: `User`
- Trigger: the user opens Phone Setup on a computer that also has a host-only or bridge adapter not covered by the exclusion list (macOS Parallels `vnic0`/`vnic1` 10.211.55.x; Linux `lxcbr0`, `lxdbr0`, `incusbr0`), all private and with a hardware address. Developer machines running Docker nodes commonly have such adapters.
- Support evidence: Phone Setup is the supported entry surface. The adapter exists independently of this design.
- Forward path: DS-008 classifier rule 4 → `localNetwork.addresses` includes the adapter address → composer builds `http://<adapter>:<port>` → the desktop check passes, because every address bound on the host reaches the same node (the embedded node listens on all interfaces, E-06) → "first passing address per way" depends on interface order → the QR may carry the adapter address.
- Lifecycle preconditions and material consequence: the local network is allowed. The phone gets an unreachable address and the "Can't reach" screen, although the Wi-Fi address would have worked.
- Reachability: `Reachable` (whether it happens depends on interface order; it is not excluded)
- Review consequence / proportionate response: AR-004. Prefer the address of the default-route interface, which `local-network-identity.ts` already reads.

### P-003 — Tailscale Serve HTTPS port above 65535 for a Docker node on a random published port

- Related approved requirement: REQ-008 ("its own port and an HTTPS port free of the other nodes'"), AC-006.
- Relevant behavior ID(s): BEH-002
- Initiating basis kind: `User`
- Trigger: a Docker node published with a random host port. E-05 measured `0.0.0.0:50433->8000` on the user's machine; Docker's ephemeral range on Linux reaches 60999. The user opens Tailscale › Advanced in that node's window.
- Forward path: `tailscaleServeCommand` → `--https=<port+10000>` → a port ≥ 55536 gives a value > 65535.
- Consequence: the optional command shown is invalid. The rule also does not guarantee "free of the other nodes'" (a node on 8001 and a node on 18001 collide).
- Reachability: `Reachable`
- Review consequence: AR-007 (Low).

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Shared-text intent (`ACTION_SEND`) carrying a pairing link (`MainActivity.kt:55-59, 73-77`) | DEC-007 settles "app scan pairs at once" and "browser link: one tap"; a link shared from another app is neither | Solution Designer decides (within DEC-007's reasoning or with the user) and records it; the design then traces it (AR-006) | Open |

## Review Decision

- `Fail`: the design needs upstream rework before implementation.

## Findings

### AR-001 — The shell bridge is reachable from sandboxed HTML previews (Design Impact, High, blocking)

- Protected authority: the established autobyteus-417 contract (REQ-002, SCN-004: a preview "cannot act as the app"); this ticket's QR-003 and trusted-network constraint; DEC-001's "no credential crosses" (kept) plus no new trusted surface.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No` (it keeps an existing security contract).
- Evidence: design-spec Key Tradeoffs ("Any frame in the WebView could call it … accepted and recorded"); the phone page has sandboxed preview frames (`HtmlPreviewer.vue:8`, reached from `MobileFileViewer.vue`); Android documents `addJavascriptInterface` as exposed to all frames with no origin control. Premise P-001.
- Required update: make the bridge reachable only from the node page's main frame or origin. Options: androidx.webkit `WebViewCompat.addWebMessageListener` with the open node's origin as the allowed origin rule (opaque-origin preview frames are excluded; this adds a library dependency, not a permission, and minSdk 26 is supported); or a main-frame-only signal checked in the activity. Record the choice under Key Tradeoffs. Keeping `addJavascriptInterface` as is requires an explicit exception to the 417 contract, which is a user decision (`Requirement Gap`), not a design acceptance.
- Who drives the sequence: the page posts a request; `MainActivity` decides and acts on the UI thread; the bridge carries requests only.
- Proportionate: one mechanism swap in `ShellBridge.kt` / `shellBridge.ts`; it closes a path a recent ticket closed for desktop and phone storage.
- Recipient: Solution Designer.

### AR-002 — Way composition for remote nodes and the company address is not traced (Design Impact, Medium, blocking)

- Protected authority: REQ-007 ("its addresses come from that node and from the address the desktop reaches it at, each checked"), AC-005, REQ-002 rank (0) and Company address tab (REQ-022), REQ-003, BEH-003; Principle 1 (each kind and entry form traced).
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence:
  - The composer example covers only the Docker node. DS-001 does not say which way (tab) the desktop's base URL for a remote node falls into, which acknowledgement it carries, or whose allowed-network answer applies when it is a plain private address.
  - A remote node in a container reports `tailscale: null, vpnAddresses: [], localNetwork: null` (Interface table), so only the desktop's address could serve it, and that path is undefined.
  - `configuredBaseUrl` is "null when loopback or in a container". The documented server deployment is the Docker image (`docker/entrypoint.sh:13-14`, `docker-compose.yml:15`), and an admin sets `AUTOBYTEUS_SERVER_HOST` to the company address there. The container clause drops exactly that case. The loopback clause alone, plus the REQ-003 check, is enough to filter wrong values.
  - Whether a typed company address ("Use this address", TR-008) is checked against the node ID (REQ-003) before the code is created is not stated. Today's `verifyAdvertisedUrlForRemoteQr` (`phoneAccessStore.ts:165-190`) does check it.
- Required update: trace the remote node in DS-001 with an example covering own facts, the desktop's base URL classified into a way, and a container remote node. Define `configuredBaseUrl` without the container exclusion, or justify the exclusion with evidence. State that a typed company address goes through the same node-ID check.
- Recipient: Solution Designer.

### AR-003 — The Tailscale signal in the classifier differs from DEC-003 (Design Impact, Medium, blocking)

- Protected authority: DEC-003 ("a confirmed Tailscale address (100.x with a `.ts.net` name) … Unconfirmed 100.x stays 'home network'"), ASM-001 / U-001 ("Tailscale only when the reverse name ends in `.ts.net` (or an equally positive signal)"), QR-002, REQ-002.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No` if aligned; `Yes` if DEC-003 is widened (Solution Designer within direction, recorded).
- Evidence: classifier rule 2 treats any `100.64.0.0/10` address with no hardware address, or on a `tailscale*` interface, as Tailscale, whatever the reverse name. Such an address then needs no question (`tailscale` → acknowledgement `true`) and gets "Works anywhere through Tailscale". The design does not argue that "no hardware address" is an equally positive signal, and does not mention DEC-003 there.
- Required update: either confirm Tailscale by `.ts.net` reverse name or `tailscale*` interface name, and state what an unconfirmed no-hardware-address `100.64/10` address becomes; or record why the no-hardware-address rule is equally positive and have the Solution Designer amend DEC-003 / ASM-001 to match. Note the tab's ready line and the trust rule follow the same signal.
- Recipient: Solution Designer.

### AR-004 — The local-network address choice falls to interface order (Design Impact, Medium, blocking)

- Protected authority: REQ-002 rank (4) "its local Wi-Fi/cable address", REQ-003, AC-002, AC-004.
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence: premise P-002. Classifier rule 4 admits any private interface with a hardware address. The desktop check cannot tell the host's own addresses apart. "First passing address per way is used." `NodeNetwork.localNetwork.addresses` has no order.
- Required update: define the order. For example, `local-network-identity.ts` already resolves the default route; its interface's address goes first, or is the only local address. Decide the same for several VPN addresses. Add the case to the classifier fixtures.
- Recipient: Solution Designer.

### AR-005 — The discard route puts the live pairing code in a logged path (Design Impact, Low, blocking)

- Protected authority: REQ-016 ("pairing data is redacted in logs"), QR-001 ("pairing values redacted").
- Scope status: `Within Approved Scope`. Changes approved behavior: `No`.
- Evidence: `DELETE /rest/remote-access/pairing-sessions/:pairingCode`. The access log writes `redactSensitiveUrl(request.url)` (`http-access-log-policy.ts:74`), and the refusal log does the same (`remote-access-policy-plugin.ts:42`). `redact-sensitive-url.ts:1-47` redacts query keys only, so the path code is logged as is. A refused or failed DELETE leaves that code live.
- Required update: identify the session by an opaque ID returned at creation, or redact that path segment in `redact-sensitive-url.ts`. Name the choice in the interface table.
- Recipient: Solution Designer.

### AR-006 — The Android connect sequence does not trace all entry forms or the failed exchange (Design Impact, Medium, blocking)

- Protected authority: REQ-010 / AC-008 (scan → run list; failure → plain reason, Scan again), REQ-012 ("Opening the app still opens the last used node"), REQ-013 / AC-011, DEC-007, spec TR-013 / UXJ-006 reasons (expired, used), QR-003; Principle 1 (entry forms), Principle 13 (who drives the sequence).
- Scope status: `Within Approved Scope`, except the shared-intent choice (Solution Designer, see Gaps). Changes approved behavior: `No`, except that choice.
- Evidence:
  - DS-004 traces only "App Scan / node row tap". Not traced: app start auto-opening the last node (`MainActivity.kt:62-64`), Paste a link, Type an address, a shared-text intent (`MainActivity.kt:55-59, 73-77`, today submitted directly), and Switch node. The rule "parsed pairing payload = acknowledged" plus "the page auto-pairs whenever the bridge is present" would make a link shared from another app pair with no tap. DEC-007 does not cover that.
  - The exchange result is decided in the page, but the entry is saved before it (current `MainActivity.kt:188-189`). The design lists page states "expired/used … Scan again", but does not say what happens to the saved entry, how "back to the list" works, or how `REMOTE_ACCESS_PAIRING_INVALID` maps to a reason. A used or closed code is deleted on consume (`remote-access-pairing-service.ts:134`) and answers INVALID, never CONSUMED.
  - The node list's "Online / Not reachable / Checking…" probes (UIS-006/007) have no owner.
- Required update: add a small entry-form table to DS-004: for each form, whether it is acknowledged and whether it auto-pairs, with the shared-intent decision recorded by the Solution Designer. Define the failed-exchange return: which surface shows it, whether a new entry is kept or removed and who does it, and the error-code → reason mapping. Assign the list reachability checks to an owner (for example `NodeConnectionFlow` or a list presenter, using `ConnectionValidator` in parallel).
- Recipient: Solution Designer.

### AR-007 — The Tailscale Serve port rule can produce invalid or colliding ports (Design Impact, Low, required)

- Protected authority: REQ-008 ("an HTTPS port free of the other nodes'"), AC-006.
- Evidence: premise P-003; `tailscaleServeCommand.ts` uses `port+10000`.
- Required update: define the rule's range and collision handling (for example, choose from a range checked against the ports in the node registry, never above 65535). Keep it confirmed against Tailscale docs (U-006).
- Recipient: Solution Designer.

### AR-008 — Rationale and ownership details to correct (Design Impact, Low; the name owner is required, the rest non-blocking)

- Protected authority: DEC-016, REQ-011, QR-004; Principle 1 (cited claims).
- Items:
  1. Required: assign who picks the QR `serverName`. Per DEC-016 that is the computer name from `NodeNetwork.computerName` for the embedded node and the registry name for Docker and remote nodes. Today the store sends the constant (`phoneAccessStore.ts:53-57`).
  2. Correct the Backward-Compatibility Rejection Log and Derived Consumers. Installed Android and iOS apps default the missing status `serverName` to "AutoByteus Desktop" and overwrite the QR name with it (`ConnectionValidator.kt:57`, `MainActivity.kt:185`, `ConnectionValidator.swift:30`). Their names stay as today until the app updates. There is no regression and no code change, but say so honestly.
  3. Bound `dns.reverse` in DS-008 with a timeout (for example a `dns.Resolver` with a timeout and tries). Without MagicDNS the reverse query can stall `/network` past QR-004's 3 s.
- Recipient: Solution Designer.

### AR-009 — Requirements wording that downstream validation will trip on (Requirement Gap, Low, non-blocking; recommended in this revision)

- Evidence:
  - REQ-008 says "under Other options", but REQ-023 says there is no Other options fold (the spec uses "Advanced").
  - AC-001/AC-002/AC-005 still use superseded copy: "Connect a phone", "Use this Wi-Fi", "Connects anywhere…", "Enter an address".
  - DEC-001's text includes "Add a node" in the sheet, but REQ-013 says there is none.
  - DEC-006 is still "Decided" although DEC-019 superseded it.
  - The Supplemental Artifacts table still lists "Product design (pending)", and the header cites E-01…E-19.
  - The spec's "several addresses; the first that answers wins" row is superseded by DEC-019 without a note.
  - The spec's first-launch line "choose Connect a phone" names a desktop button that no longer exists.
- The "spec governs" clause covers the layout, but API/E2E validates against the AC wording. Recommend the Solution Designer align these, and settle the first-launch copy as for DEC-016…018.
- Recipient: Solution Designer.

## Classification

- Overall failure classification: `Design Impact` (AR-001…AR-008), plus one Solution Designer decision inside AR-006 (shared-intent pairing) and the non-blocking requirement hygiene in AR-009.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- U-001 / U-004 / U-005 on Linux are read, not run. The planned fixtures and one real Linux host check are adequate once AR-003 and AR-004 fix the rules.
- U-003: the address check reuses the renderer `fetch` path already used today. Confirming it on the packaged build stays in implementation.
- U-006: only the optional Advanced text depends on Tailscale Serve accepting the chosen `--https` port.
- Network ID flipping between `gw_…` and `this-computer` when the 1 s gateway read times out would ask the question again. This is acceptable as a fallback; worth one unit case.
- Browser mode (web app served by a node with no embedded entry) is not a Phone Setup path in the requirements. DS-002 assumes an embedded entry exists.
- Sources on the Android bridge: [Android: Access native APIs with JavaScript bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge); [androidx.webkit WebViewCompat](https://developer.android.com/reference/kotlin/androidx/webkit/WebViewCompat); [OWASP MASTG-KNOW-0018](https://mas.owasp.org/MASTG/knowledge/android/MASVS-PLATFORM/MASTG-KNOW-0018/).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (P-001…P-003 Reachable with independent triggers; no finding relies on an unsupported premise)
- Notes: the overall structure is sound and implementable: one facts owner per computer, a pure way policy on the desktop, the pairing service kept as the single code owner, an unchanged payload, and no migration. The blocking items are a bridge mechanism swap, missing traces (remote node, entry forms), two classifier rules aligned to approved decisions, and one logging identity. `task_size = Large`, `architectural_risk = High`.
