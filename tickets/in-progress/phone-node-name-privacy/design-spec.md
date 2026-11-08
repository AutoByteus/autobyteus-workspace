# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-002 design revised for CRR-001 F-001 at SR-003; DS-006 reset point revised at SR-004 after the IR-002 premise check)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-003` (REQ-006, AC-007, DEC-009 revised; the rest as at `SR-001`), approved by the Solution Designer within the direction (user informed in the Solution Designer's conversation, 2026-11-08); the user's own decision is the Task comment of 2026-11-08 (no address, no Details action, plain-language messages).
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/investigation-notes.md`
- Authorities read (2026-11-08): `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; project `DESIGN.md` (root; rules 9, 10, 11 apply), `GLOSSARY.md` (Nodes: *Entry*), `docs/design-cases.md` (phone cases of autobyteus-426/427), `autobyteus-web/AGENTS.md`. No closer `DESIGN*.md` exists for `autobyteus-android` or `autobyteus-web`.
- Project design-principle conflicts or discrepancies: None. Rule 9 (one release, no mixed-version design) shaped the requirements: the bridge reply changes as a clean cut and no mixed APK/page behavior is promised.

## Current-State Read

The node's name reaches three surfaces from three different owners:

- **The node page (`/mobile`, served by the node, shown in the app's WebView).** `MobilePairedShell.vue:130` decides the name: `session?.nodeName || hostOf(serverBaseUrl)`, and passes it to `MobileRunList` (header, aria label, offline banner) and `MobileConnectionSheet` (title, "Unpair from …"); the post-pair screen uses it too (`MobilePairedShell.vue:13`). The session's `nodeName` exists only for pairings after autobyteus-395 (`types/remoteAccess.ts:57-68`), so older sessions show the host (BEH-001). The sheet additionally prints `serverBaseUrl` unconditionally (`MobileConnectionSheet.vue:8`, BEH-002). The pairing page falls back to the host the same way (`MobilePairingBootstrap.vue:113`, BEH-008).
- **The Android app's own screens.** Every surface reads `SavedNodeEntry.displayName` directly: `NodeRow.kt`, `RemoveNodeSheet.kt`, `MainActivity.openPage` ("Connected to"), `NodeConnectionFlow.run` (Connecting, Can't reach), `ConnectionValidator.validate` (Phone access off). `SavedNodeEntry.fromNormalized` stores the host as `displayName` when no name is given (`SavedNodeEntry.kt:35`), which is every typed address (BEH-003). `NodeConnectionFlow.onPaired` renames only a pending QR entry (`NodeConnectionFlow.kt:86-94`, BEH-004) and already encodes "no name" as `displayName != host`.
- **The bridge between them.** `ShellBridge.kt` answers `hello` with `nodeCount` and `deviceName` only; the page has no way to learn the app's name for the node. The bridge is created per open entry (`MainActivity.openPage`: `ShellBridge(entry, bridgeActions)`), restricted to the entry's origin and the main frame.

Overlays and toasts while a page is open (`AutoByteusWebView.kt:70, 96, 111, 131`, `MainActivity.kt:200`, `WebFileChooserCoordinator.kt:58`) build texts in `ConnectionDiagnosticMapper` with URLs or raw error text (BEH-006); `fromException` puts the exception message in every failed status check's diagnostic (BEH-007).

No ownership problem blocks the change: each surface has one owner, and the fix is to give each owner a correct name source and remove the address from its text.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 20 files across two existing packages (`autobyteus-web` mobile components and one util; `autobyteus-android` entry, flow, bridge, diagnostics, web host, two UI files, activity) plus their tests and one probe; every change sits inside an existing owner; no new subsystem, route or persisted field.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: the only contract change is one added field in the app↔page `hello` reply, both ends in this repository and in one release (`DESIGN.md` rule 9); the bridge's origin/main-frame rule, pairing, credentials, Host/Origin rules and the server are untouched; persisted data is directly usable (no migration); one existing write path (`saveEntry`) gains one caller condition.
- Escalation trigger if implementation or validation discovers new impact: any need to change the server, the pairing payload, the bridge's origin rule, stored entry fields, or to show an address anywhere (the latter needs the user, per the Task comment).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `autobyteus-web/components/mobile/MobilePairedShell.vue:13, 18-48, 129-130, 162-164` | One computed `nodeName` feeds header, banner, sheet, post-pair | Change the source in this one place | None |
| Code | `autobyteus-web/components/mobile/connection/MobileConnectionSheet.vue:7-8, 61-78` | Address line; the sheet calls `hello()` on each mount for the node count | Remove the line and its prop; keep the sheet's own hello (count must stay fresh after Switch node removals) | None |
| Code | `autobyteus-web/components/mobile/MobilePairingBootstrap.vue:111-114, 129-140, 147-149` | Host fallback; `bridge.paired(session.nodeName ?? nodeName.value)` | Fallback label; report only the QR name | None |
| Code | `autobyteus-web/utils/remoteAccess/shellBridge.ts:6-48` | `ShellHello` and `parseHello` | Add `nodeName` | None |
| Code | `autobyteus-android/.../web/ShellBridge.kt:20-27, 51-55, 91-95` | Reply built by `ShellBridgeMessages.helloReply`; the bridge holds the open `entry` | Reply carries the entry's known name | None |
| Code | `autobyteus-android/.../connection/SavedNodeEntry.kt:9-45` | `displayName` = name or host | Derived `knownName` / `shownName` on the entry | None |
| Code | `autobyteus-android/.../shell/NodeConnectionFlow.kt:37-138` | `pendingPairing`, `opened`, `onPaired` | Track the open entry; name an unnamed open entry on `paired` | None |
| Code | `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt:41-110` and callers (investigation Source Log) | URL/detail-bearing texts | Parameter-free texts; node name where the text names one | None |
| Code | `autobyteus-web/tests/e2e/mobile-shell-probe.mjs:1504` | The probe reads `mobile-connection-url` | The probe asserts the sheet's text has no address instead | None |
| Code | `SavedNodeStore.kt:36-44` | `saveEntry` replaces by ID and selects it | Renaming the open entry reuses it | None |

## Intended Change

Give each name owner a name source that is never the address: the page prefers the app's name for the node, then its session's QR name, then "AutoByteus node"; the app shows an entry's known name or "AutoByteus node" and names an unnamed node when its page pairs; the sheet's address line and every URL/raw-error text on the phone go away.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005. Areas: the `/mobile` paired shell, connection sheet, pairing page and bridge client (`autobyteus-web`); the Android entry model, connect flow, bridge, diagnostics texts, web host (now also its main-frame load outcome), activity (when the page and the overlay show), web shell screen (the page hidden under an overlay), node row and remove sheet (`autobyteus-android`); their unit tests; the mobile shell probe; the two package docs that describe the bridge and the sheet.
- Derived consumers: `SavedNodeEntry` gains two derived properties; its readers decide as follows: `NodeRow`, `RemoveNodeSheet`, `MainActivity` (Connected, toast), `NodeConnectionFlow` (Connecting, Can't reach), `ConnectionValidator` (Phone access off), `AutoByteusWebView` (page load failure) → `shownName`; `ShellBridge` hello and `NodeConnectionFlow.onPaired` → `knownName`; `SavedNodeStore` (persistence), `TrustedNavigationPolicy`, `OpenPageRestore`, `NodeReachability` → unchanged (they do not read the name). `ShellHello` gains `nodeName`; its readers: `MobilePairedShell` (uses it), `MobileConnectionSheet` and `MobilePairingBootstrap` (unchanged: they read `nodeCount` / `deviceName`).
- Deliberately left alone: the server and pairing payload; the desktop Phone Setup and Nodes pages and the QR; the iOS native shell; `TypeAddressSheet` (shows what the user types); the overlay's Retry/Edit/Browser actions (DEC-008); web diagnostics (`mobileConnectionDiagnostics.ts`, they print no address); how nodes are named on the desktop.
- Follow-ups: `FU-001` (the overlay's raw HTTP-status title, wording only; not an address) — see `follow-ups.md`. `FU-002` (overlay stays after a successful Retry) is folded into this ticket at SR-003 (DEC-009).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior Reference | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001; AC-001, AC-003, AC-009 | Open a node | Investigation BEH-001 | App name → session name → "AutoByteus node" | DS-001 |
| BEH-002 | User | REQ-002; AC-002 | Tap the header | BEH-002 | No address line | DS-001 (sheet leaf) |
| BEH-003 | User | REQ-003; AC-004 | First page, Switch node, connect | BEH-003 | `shownName` everywhere | DS-002 |
| BEH-004 | User | REQ-005; AC-005 | Page of an unnamed node pairs | BEH-004 | Entry takes the QR name | DS-003 |
| BEH-005 | User | REQ-004; AC-006 | Typed address unusable | BEH-005 | "Can't connect", no typed text | DS-002 |
| BEH-006 | User / System | REQ-006; AC-007 | Link, download, load failure (reload, Back, Retry, first load) | BEH-006; CRR-001 F-001 | Plain texts, no URL; the page is hidden while an overlay is up; a successful load closes the overlay | DS-004, DS-006 |
| BEH-007 | System | REQ-007; AC-008 | Status check exception | BEH-007 | No exception text | DS-002 (diagnostic leaf) |
| BEH-008 | User | REQ-008; AC-003 | Pairing page, QR without name | BEH-008 | "AutoByteus node" | DS-005 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (privacy fix)
- Current design issue found: `Yes`, small
- Structural triggers that fire:
  - *Behavior by absence* (Principle 13): today "show the host" happens because the name lookup finds nothing (`MobilePairedShell.vue:130`, `SavedNodeEntry.kt:35`). The design makes the fallback an explicit rule with its own result ("AutoByteus node"), owned once per codebase (`nodeNameOrDefault`, `SavedNodeEntry.shownName`).
  - *Derived data* (Principle 11): "the entry has no name" is computed in `NodeConnectionFlow.onPaired` (`displayName != host`); the new display rule needs the same fact, so it moves to one owner, `SavedNodeEntry.knownName`, and `onPaired` reads it.
  - *Several kinds or forms* (Principle 1): the name serves QR entries, typed entries and legacy host-named entries in the app, and in-app and browser pages on the web; each is a row in the tests (AC-003, AC-004).
  - *Behavior by absence* (Principle 13), second instance (SR-003, CRR-001 F-001): when the page shows was decided by "the first `onPageFinished`", which also fires for a failed load. The web host now decides the load outcome with its own result (`onPageLoaded`), and `MainActivity` shows the page on that result only.
  - Ruled out: *Responsibility overload* (`MainActivity.kt` 361 lines, changes are one-line call-site edits; `MobilePairedShell.vue` 165 lines); *Persisted-data transition* (no stored field changes; see below); *Ambiguous boundary* (the `hello` reply stays one subject: this phone and its open entry).
- Root cause classification: `Missing Invariant` (no owner enforced "a node is never shown by its address").
- Refactor needed now: `No` beyond the two small owners named above, which are part of the fix.
- Evidence: Current-State Read; investigation Source Log.
- Design response: one name rule per codebase; callers read it; URL-bearing texts lose their URL parameters.
- Refactor rationale: the existing owners are right; they lacked the rule.
- Intentional deferrals and residual risk: two never-paired typed nodes both read "AutoByteus node" (DEC-004).

## Terminology

- **Known name** (Android `SavedNodeEntry.knownName`): the node's name from its QR or its page's pairing; `null` when the entry has none (its stored `displayName` then holds its host, as today).
- **Shown name** (`SavedNodeEntry.shownName`, web `nodeNameOrDefault(...)`): what the phone shows for a node: its known name, or "AutoByteus node". Never an address.
- These are UI-local derived terms, not new domain words; `GLOSSARY.md` *Entry* is unchanged. No glossary change.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in this scope: the host fallbacks (`hostOf` in `MobilePairedShell.vue` and `MobilePairingBootstrap.vue`); the sheet's address line and `serverBaseUrl` prop; the URL/description parameters of `ConnectionDiagnosticMapper` texts; the `url` parameter of the external-open callback.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`. The page's "session name, then label" steps are not version fallbacks: they serve the browser (no app) and an app entry with no name, both current supported states.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject: Android `SharedPreferences` `saved_nodes` → `entries` (a handful of entries per phone); page `localStorage` session.
- Relevant change: none to either shape. The meaning of `displayName` stays "the name, or the host when the node has none" (as written today by `fromNormalized`); a new derived property interprets it.
- Normal reader/writer behavior: `SavedNodeStore.toEntry/toJson` read and write all fields; unchanged.
- Required semantics: entries keep IDs, addresses, selection; a legacy entry whose `displayName` equals its host reads as unnamed.
- Decision: `Directly Usable — No Migration`.
- Rationale: the derived rule reads existing data correctly; rewriting host-named entries would change nothing visible (they show "AutoByteus node" either way) and would add a migration for no benefit (DEC-005).
- Supported ACs: AC-004, AC-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | The page mounts in the app's WebView | Header, banner, sheet show the name | `MobilePairedShell.vue` | The reported leak |
| DS-002 | Primary End-to-End | BEH-003, BEH-005, BEH-007 | The user opens, switches to or adds a node | Connecting / Connected / Can't reach / list rows show the shown name | `NodeConnectionFlow` (connect), `MainActivity` (screens) | The app's own screens |
| DS-003 | Return-Event | BEH-004 | The page reports `paired(name)` | The saved entry carries the name | `NodeConnectionFlow.onPaired` | Names typed nodes |
| DS-004 | Return-Event | BEH-006 | WebView navigation / load error / download | Toast or overlay text | `AutoByteusWebView` → `MainActivity` | In-page leaks |
| DS-006 | Bounded Local | BEH-006 | A main-frame error, or the `onPageFinished` of a main-frame load | `onPageLoaded()` or nothing | `AutoByteusWebView` | Decides whether a load succeeded, so the page shows only after one |
| DS-005 | Primary End-to-End | BEH-008 | A pairing link opens the page | Pairing page title and report to the app | `MobilePairingBootstrap.vue` | Same rule on the pairing page |

## Primary Execution Spine(s)

- DS-001: `App opens entry -> ShellBridge(entry) registered -> /mobile page mounts MobilePairedShell -> shellBridge.hello() -> ShellBridge replies {nodeCount, deviceName, nodeName: entry.knownName ?: ""} -> MobilePairedShell nodeName = nodeNameOrDefault(hello.nodeName, session.nodeName) -> MobileRunList header / MobileConnectionSheet`
- DS-002: `StartScreen row tap / Scan / Type an address -> NodeConnectionFlow.open|connect|connectTyped -> ConnectionValidator.validate -> NodeConnectionFlow.run -> Screens.showConnecting(entry.shownName) -> showCantReach(entry.shownName | "", reason) or openPage(entry) -> ConnectingScreen.connected(entry.shownName)`
- DS-005: `Pairing link -> MobilePairingBootstrap nodeName = nodeNameOrDefault(payload.serverName) -> pair() -> bridge.paired(session.nodeName ?? "")`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When the page mounts in the app, it asks the app once for its name for this node (the same `hello` it already uses) while its status check runs. Until the answer arrives (a local message, normally milliseconds; at most 1.5 s) the header shows the session's name or "AutoByteus node"; then the app's name. In a browser there is no bridge: the session's name or "AutoByteus node". | the page, the app's entry | `MobilePairedShell.vue` | `nodeNameOrDefault`; `shellBridge.ts` |
| DS-002 | Every app screen that names a node reads `entry.shownName`; a typed address that cannot be used passes no name, so the screen titles itself "Can't connect". | the entry | `NodeConnectionFlow`, `MainActivity` | `SavedNodeEntry.shownName`; `ConnectionDiagnosticMapper` texts |
| DS-003 | When the page reports a pairing, the flow names the pending QR entry (as today) or, new, the open saved entry if it has no known name, and saves it. A named entry is never renamed by the page. | the entry | `NodeConnectionFlow` | `SavedNodeStore.saveEntry` |
| DS-004 | WebView events produce diagnostics without URLs; the load failure names the open entry. While any overlay is up, the WebView stays in the layout but is `INVISIBLE` (not drawn, not in the accessibility tree), so neither the page nor WebView's built-in error page (which prints the URL) can show; the overlay is opaque. The page shows again only when the web host reports a load that succeeded (Retry, Back, a reload), which also closes the overlay. The external-open toast carries no URL. | the open page | `AutoByteusWebView` (load outcome), `MainActivity` (which screen shows) | `ConnectionDiagnosticMapper`; `WebShellScreen` |
| DS-005 | The pairing page shows the QR's name or "AutoByteus node", and reports only the QR name (or nothing) to the app, so the app never stores the label as a name. | the pairing link | `MobilePairingBootstrap.vue` | `nodeNameOrDefault` |

## Spine Actors / Main-Line Nodes

`MobilePairedShell.vue`, `MobilePairingBootstrap.vue`, `ShellBridge` (app), `NodeConnectionFlow`, `MainActivity`, `AutoByteusWebView`.

## Ownership Map

- `MobilePairedShell.vue`: owns the page's node name (now: the order of sources) and passes it down; owns the one `hello` it makes for the name.
- `MobileConnectionSheet.vue`: renders name, state, actions; owns its own `hello` for the node count (unchanged).
- `MobilePairingBootstrap.vue`: owns the pairing page's name and what it reports to the app.
- `SavedNodeEntry`: owns the rule "known name / shown name" for an entry.
- `NodeConnectionFlow`: owns the connect sequence, the open entry and naming on `paired`.
- `ShellBridge` (app): owns the reply contents for the open entry.
- `ConnectionDiagnosticMapper`: owns every diagnostic text.
- `MainActivity`: renders screens and the toast with the names it is given.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `hostOf()` in `MobilePairedShell.vue` | Dead: its only caller (the name fallback) is replaced | `nodeNameOrDefault` | — |
| `hostOf()` in `MobilePairingBootstrap.vue` | Dead: same | `nodeNameOrDefault` | — |
| `serverBaseUrl` prop and `mobile-connection-url` line of `MobileConnectionSheet.vue` | REQ-002 | — | `MobilePairedShell` stops passing it; probe and spec stop reading it |
| `ConnectionDiagnosticMapper.webViewLoadFailed(description)` | Its three callers get their own texts | `pageLoadFailed(nodeName)`, `noAppForLink()`, `noFilePicker()` | — |
| `ConnectionDiagnosticMapper.unsafeNavigationBlocked(url)` | URL removed | `linkBlocked()` | — |
| `url` parameter of `invalidUrl`, `httpNeedsAcknowledgement`; exception detail in `fromException` | REQ-007 | parameter-free texts | — |
| `url` parameter of `AutoByteusWebView.onExternalUrl` | The toast no longer prints it | `onOpenedOutside: () -> Unit` | `AutoByteusMobileShellSmokeTest` passes `{}` already |
| `onPageStarted: (String) -> Unit` and `onPageFinished: (String) -> Unit` parameters of `AutoByteusWebView` | `onPageStarted` is dead (its only production caller passes `{}`); `onPageFinished` fires for failed loads too, so it cannot decide when to show the page | `onPageLoaded: () -> Unit` (a load that succeeded) | `AutoByteusMobileShellSmokeTest` passes the new parameter |
| Translucent overlay background `argb(235, …)` in `WebShellScreen` | The page underneath must not show (F-001) | Opaque background; WebView `INVISIBLE` while a diagnostic is shown | — |
| `qrHadName` computation in `NodeConnectionFlow.onPaired` | The fact moves to its owner | `SavedNodeEntry.knownName` | — |
| Test "a session paired before the name was kept shows the address's host" | Asserts removed behavior | Tests of the new order | `DESIGN.md` rule 11 |

## Return Or Event Spine(s) (If Applicable)

- DS-003: `MobilePairingBootstrap.pair() -> bridge.paired(session.nodeName ?? "") -> ShellBridge (origin/main-frame check) -> MainActivity.bridgeActions.onPaired -> NodeConnectionFlow.onPaired(name) -> SavedNodeStore.saveEntry(named entry)`
- DS-004: `WebViewClient.onReceivedError / onReceivedHttpError (main frame) -> AutoByteusWebView marks this load failed -> onDiagnostic(pageLoadFailed(entry.shownName) | fromHttpStatus(code)) -> MainActivity.showWebDiagnostic (records the overlay) -> WebShellScreen.render(webView INVISIBLE, opaque overlay)`; later `onPageFinished` of a load not marked failed -> `onPageLoaded()` -> `MainActivity`: first page not shown yet, or an overlay is up -> `showPage()` (WebView VISIBLE, no overlay, overlay record cleared)`; `openExternal(url) -> onOpenedOutside() -> Toast("Opening outside AutoByteus")`.

## Bounded Local / Internal Spines (If Applicable)

- DS-006, parent owner `AutoByteusWebView` (its `WebViewClient`), as revised at SR-004: `[onReceivedError | onReceivedHttpError for the main frame -> failed = true -> onDiagnostic] ... onPageFinished -> loaded = !failed; failed = false -> if loaded: onPageLoaded()`. `onPageStarted` does not touch the mark. It matters because WebView calls `onPageFinished` for a failed load too (its error page finished loading): that is what made `MainActivity` replace the first-load overlay with the error page, and what left the overlay up after a successful Retry (FU-002). Measured order (IR-002, IMP-09, `evidence/IMP-09-sr003-load-order-premise.log`, WebView 124.0.6367.219, two runs): network failure `onPageStarted -> onReceivedError(main) -> onPageFinished`; HTTP 502 `onReceivedHttpError(main) -> onPageStarted -> onPageFinished`; success `onPageStarted -> onPageFinished`; a sub-resource HTTP error (`main=false`) after `onPageFinished`, ignored. `onPageFinished` is the one callback that always ends a main-frame load, whatever the error kind, so the outcome is decided and the mark reset there. Rejected: resetting in `onPageStarted` (erases an HTTP error, which arrives first) and keying the mark by URL (a redirect such as `/mobile` → `/mobile/` can make the error's URL and the started URL differ). Accepted residual: a main-frame error whose `onPageFinished` never comes (a load cancelled mid-way; not observed) leaves the mark, so the next finished load is treated as failed and the overlay stays until one more Retry. That errs toward hiding the page, never toward showing an address.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `nodeNameOrDefault` (`utils/remoteAccess/nodeName.ts`) | DS-001, DS-005 | `MobilePairedShell`, `MobilePairingBootstrap` | First non-blank name, else "AutoByteus node" | Two components need the same rule | Two copies drift (as the two `hostOf` copies did) |
| `SavedNodeEntry.knownName` / `shownName` | DS-002, DS-003, DS-004 | All app screens, the flow, the bridge | The entry's name rule | Many readers | Each screen deciding "is this a name?" |
| `ConnectionDiagnosticMapper` texts | DS-002, DS-004 | Flow, web host, file chooser | Wording | Existing owner of texts | — |

## Ownership Boundaries

- The page never reads an address to name a node; the app never shows `displayName` directly in UI (only through `shownName`).
- The bridge stays the only path between the page and the app; its origin and main-frame rule (`ShellBridgeMessages.read`) is unchanged; the reply carries no credential.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SavedNodeEntry.shownName` / `knownName` | the `displayName == host` interpretation | `NodeRow`, `RemoveNodeSheet`, `MainActivity`, `NodeConnectionFlow`, `ConnectionValidator`, `AutoByteusWebView`, `ShellBridge` | A UI file reading `displayName` or comparing it with `host` | Add a property on the entry |
| `getShellBridge().hello()` | message posting and parsing | `MobilePairedShell`, `MobileConnectionSheet`, `MobilePairingBootstrap` | Reading `window.AutoByteusShell` directly | Extend `ShellHello` |

## Dependency Rules

- `ui/*` and `MainActivity` → `SavedNodeEntry` (allowed); `connection/*` must not depend on `ui/*` (unchanged; `httpNeedsAcknowledgement` therefore does not reuse `TypeAddressSheet.HTTP_ACKNOWLEDGEMENT`).
- Web components → `utils/remoteAccess/nodeName.ts` and `utils/remoteAccess/shellBridge.ts` (allowed).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| Bridge `hello` reply `{type:"shell", nodeCount, deviceName, nodeName}` | This phone and its open entry | Facts the page may show | None (implicit: the open entry, by the bridge's origin rule) | `nodeName` is `""` when the entry has no known name |
| `ShellHello.nodeName: string` (web) | Same | Parsed reply | — | `''` when absent or not a string, like `deviceName` |
| `nodeNameOrDefault(...names)` | A node's shown name on the page | Pick the first non-blank, else the label | Ordered candidate names | Pure |
| `SavedNodeEntry.knownName: String?`, `shownName: String` | One entry | Name rule | The entry | Derived, not stored |
| `NodeConnectionFlow.onPaired(pageNodeName)` | The open page's entry | Name it on pairing | The pending or open entry | — |
| `ConnectionDiagnosticMapper.pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`, `invalidUrl()`, `httpNeedsAcknowledgement()` | One diagnostic each | Text | — | No URL parameters |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `hello` reply | Yes | Yes (open entry) | Low | — |
| `nodeNameOrDefault` | Yes | Yes | Low | — |
| `SavedNodeEntry` name properties | Yes | Yes | Low | — |
| `onPaired` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural? | Same Meaning Everywhere? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Reply field | `nodeName` | Yes | Yes: same as the session's `nodeName` and the `paired` message's `nodeName` (a node's name as the phone shows it) | Low | — |
| Entry name rule | `knownName`, `shownName` | Yes | Yes | Low: `displayName` keeps its stored meaning "name, or host when none" (KDoc states it); renaming the stored field is not worth a migration (rule 10 applies only to a wrong or second meaning; the meaning is unchanged) | KDoc on `displayName` |
| Fallback label | "AutoByteus node" | Yes | Yes ("node" per `GLOSSARY.md`) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Page learns the app's name | Bridge `hello` | Extend | Already used, already origin-bound | — |
| Shared name rule (web) | `utils/remoteAccess/` | Extend (new small file) | The phone page's remote-access utilities live there | — |
| Entry name rule (app) | `SavedNodeEntry` | Extend | The entry owns its fields | — |
| Texts | `ConnectionDiagnosticMapper` | Reuse | Owns all diagnostic texts | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns Which Concerns | Spine IDs | Owners Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/mobile` | Page name, sheet, pairing page | DS-001, DS-005 | — | Reuse | — |
| `autobyteus-web/utils/remoteAccess` | Bridge client, name rule | DS-001, DS-005 | page components | Extend | — |
| `autobyteus-android/.../connection` | Entry, diagnostics, validator | DS-002, DS-004 | flow, UI | Extend | — |
| `autobyteus-android/.../shell` | Connect flow | DS-002, DS-003 | activity | Extend | — |
| `autobyteus-android/.../web` | Bridge, WebView host, file chooser | DS-001, DS-004 | activity | Extend | — |
| `autobyteus-android/.../ui` | Row, remove sheet | DS-002 | — | Extend | — |

## Draft File Responsibility Mapping

See the final mapping; the draft needed no extraction beyond the two name rules.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Name fallback (2 web components) | `utils/remoteAccess/nodeName.ts` | web remote access | Same rule twice today (`hostOf` ×2) | Yes | Yes | A general string helper |
| "Has no name" (flow, every UI) | `SavedNodeEntry` | Android connection | One fact | Yes | Yes | A second stored field |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ShellHello` | Yes | Yes | Low | — |
| `SavedNodeEntry` | Yes (`displayName` documented as "name, or host when none"; derived properties carry the interpretation) | Yes (nothing stored added) | Low | KDoc |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-web/utils/remoteAccess/nodeName.ts` (Add) | Name rule | `UNNAMED_NODE_NAME = 'AutoByteus node'`; `nodeNameOrDefault(...names)` |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts` (Modify) | Bridge client | `ShellHello.nodeName`; `parseHello` reads it (`''` when absent); doc comment |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` (Modify) | Page name | `appNodeName` from one `hello` on mount (not awaited by the status check); `nodeName = nodeNameOrDefault(appNodeName, session?.nodeName)`; stop passing `server-base-url`; remove `hostOf` |
| `autobyteus-web/components/mobile/connection/MobileConnectionSheet.vue` (Modify) | Sheet | Remove the address line and the `serverBaseUrl` prop; header comment |
| `autobyteus-web/components/mobile/MobilePairingBootstrap.vue` (Modify) | Pairing page | `nodeName = nodeNameOrDefault(payload?.serverName)`; `bridge.paired(session.nodeName ?? '')`; remove `hostOf` |
| `autobyteus-web/types/remoteAccess.ts` (Modify) | Session type | Comment on `nodeName`: absent for sessions paired before it was kept; the page then shows the app's name or "AutoByteus node" |
| `autobyteus-android/.../connection/SavedNodeEntry.kt` (Modify) | Entry | `knownName`, `shownName`, `UNNAMED_NODE_NAME`; KDoc on `displayName` |
| `autobyteus-android/.../shell/NodeConnectionFlow.kt` (Modify) | Connect flow | `shownName` to screens; typed failure passes `""`; track `openEntry` in `opened()`; `onPaired` names the pending entry or the open unnamed entry, using `knownName` |
| `autobyteus-android/.../web/ShellBridge.kt` (Modify) | Bridge | Reply adds `nodeName = entry.knownName.orEmpty()`; `helloReply(nodeCount, deviceName, nodeName)`; class doc ("carries no credential"; the open entry's name only) |
| `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt` (Modify) | Texts | `pageLoadFailed(nodeName)`, `linkBlocked()`, `noAppForLink()`, `noFilePicker()`; parameter-free `invalidUrl()`, `httpNeedsAcknowledgement()`; `fromException` without detail; `phoneAccessDisabled(nodeName)` unchanged |
| `autobyteus-android/.../connection/ConnectionValidator.kt` (Modify) | Status check | `invalidUrl()`; `phoneAccessDisabled(entry.shownName)` |
| `autobyteus-android/.../shell/ConnectionInputResolver.kt` (Modify) | Input parsing | `invalidUrl()`, `httpNeedsAcknowledgement()` |
| `autobyteus-android/.../web/AutoByteusWebView.kt` (Modify) | WebView host | `linkBlocked()`, `noAppForLink()`, `pageLoadFailed(entry.shownName)`; `onOpenedOutside: () -> Unit`; DS-006 (SR-004): a main-frame `onReceivedError`/`onReceivedHttpError` marks the load failed; `onPageFinished` reports `onPageLoaded()` only when it is not marked, then resets the mark; `onPageStarted` does not touch it (replaces the `onPageStarted`/`onPageFinished` callbacks) |
| `autobyteus-android/.../ui/WebShellScreen.kt` (Modify) | Page screen | With a diagnostic: WebView kept in the layout with `visibility = INVISIBLE`, overlay opaque; without: WebView `VISIBLE` |
| `autobyteus-android/.../web/WebFileChooserCoordinator.kt` (Modify) | File chooser | `noFilePicker()` |
| `autobyteus-android/.../MainActivity.kt` (Modify) | Screens | `connected(entry.shownName)`; toast "Opening outside AutoByteus"; records whether an overlay is up (`showWebDiagnostic` sets it, `showPage` clears it); `onPageLoaded`: the first page not shown yet → show it; an overlay up on the Web screen → `showPage()`; otherwise nothing (a reload while the user is on Switch node does not pull them back) |
| `autobyteus-android/.../ui/start/NodeRow.kt`, `ui/sheets/RemoveNodeSheet.kt` (Modify) | UI | `shownName` for text and accessibility labels |
| Tests (Modify/Add) | — | Listed in Guidance For Implementation |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (Modify) | Probe | Replace the `mobile-connection-url` read with an assertion that the sheet's text contains no host of the phone origin |
| `autobyteus-android/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md` (Modify, docs sync) | Docs | The bridge's `hello` carries the open node's name; the sheet shows name and state; unnamed nodes read "AutoByteus node" |

Exact texts (DEC-007; `’` as in the existing texts):

| Function | Title | Message | Recovery action |
| --- | --- | --- | --- |
| `pageLoadFailed(nodeName)` | `Can’t reach $nodeName` | `Check that Tailscale or your Wi-Fi is on and the computer is awake.` | `Then tap Retry.` |
| `linkBlocked()` | `This link can’t open here` | `AutoByteus on your phone opens only its own pages.` | `Tap Retry to go back to your runs.` |
| `noAppForLink()` | `No app can open this link` | `No app on this phone opens this kind of link.` | `Tap Retry to go back to your runs.` |
| `noFilePicker()` | `Can’t pick files` | `This phone has no app for picking files.` | `Install or turn on a file manager, then try again.` |
| `invalidUrl()` | `Check the address` | `The address could not be read.` | `Check the address and try again.` |
| `httpNeedsAcknowledgement()` | `This address has no extra protection` | `A plain http:// address needs the tick in Type an address.` | `Tick the box to use it.` |
| `fromException(error)` | unchanged | timeout: unchanged; other `IOException`: `The phone could not reach the node.`; other: `The connection check failed.` | unchanged |
| Toast | `Opening outside AutoByteus` | — | — |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

All files stay in their current folders; one new file `autobyteus-web/utils/remoteAccess/nodeName.ts` beside `shellBridge.ts` (the phone page's remote-access utilities). No folder changes.

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/remoteAccess/` | Off-Spine Concern | Yes | Low | Existing home of phone-page utilities |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Page name | `nodeNameOrDefault(appNodeName.value, sessionStore.session?.nodeName)` | `session?.nodeName \|\| hostOf(url)` | The fallback is an explicit label, never derived from the address |
| App screens | `ConnectingScreen(ui).connected(entry.shownName)` | `connected(entry.displayName)`; `if (entry.displayName == entry.host) …` in a screen | One rule, at the entry |
| Pairing report | `bridge.paired(session.nodeName ?? '')` | `bridge.paired(nodeName.value)` (would store "AutoByteus node" as the node's name) | The label is never stored |
| onPaired | `val entry = pending ?: openEntry?.takeIf { it.knownName == null } ?: return` then name it with the page's name when `entry.knownName == null` and the page's name is not blank | Renaming a named node from the page | A QR-named node keeps its name |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Version check of the `hello` reply / old-app branch on the page | APK and page ship as separate files | Rejected (`DESIGN.md` rule 9) | One field added to both ends in one release |
| Migrating host-named entries | Legacy data | `N/A` (Directly usable) | Derived rule |
| Keeping the address behind "Details" | Task lead | Rejected (the user's decision) | Removed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Web: add `nodeName.ts` and its spec; extend `shellBridge.ts`; change `MobilePairedShell`, `MobileConnectionSheet`, `MobilePairingBootstrap`; flip the host test first (reproduction), then add the new-order tests; update the probe.
2. Android: add `knownName`/`shownName` with tests; switch every reader; extend `onPaired` with tests; extend the bridge reply with tests; replace the diagnostic functions and their callers with tests.
3. Build: `/mobile` bundle and the debug APK; emulator check with an isolated node (AC-009).
4. Docs sync (delivery).

## Key Tradeoffs

- The page asks the app for its name instead of the server naming the node publicly: no server or pairing change, and the name matches the first page exactly; cost: a short moment before the reply in which the header may show the session's name or the label.
- A typed node reads "AutoByteus node" until paired instead of asking the user for a name: no new UI; two unpaired typed nodes look alike (rare).

## Risks

- SR-003: a page hidden under an overlay is not seen until a load succeeds; an overlay raised by a link (blocked, no app, no file picker) over a working page now hides the page too until Retry reloads it or Edit leaves. Accepted: one rule for every overlay, and Retry already reloads the page.

- RISK-001 (investigation): the user sees the fix only after both the app and the node(s) are updated (one release; the node serves `/mobile`). The delivery and release notes say so.
- A WebView whose `hello` times out (1.5 s) leaves the session name or the label: never the address.

## Guidance For Implementation

- Reproduction to start from: `autobyteus-web/components/mobile/__tests__/MobileRemoteAccessShell.spec.ts` test "a session paired before the name was kept shows the address's host" (lines 80-85). Change it to expect "AutoByteus node" and see it fail; it passes when the host fallback is gone. Command: `cd autobyteus-web && pnpm exec vitest run components/mobile/__tests__/MobileRemoteAccessShell.spec.ts`.
- Tests to add or change (test names only, e.g. "Test Desktop", "Test Node", `test-desktop.example-tailnet.ts.net`; never the user's names):
  - Web: `utils/remoteAccess/__tests__/nodeName.spec.ts` (first non-blank, trimming, label); `MobileRemoteAccessShell.spec.ts` (app name wins over session name and over no name, with a stubbed `window.AutoByteusShell`; session name in a browser; label with neither; header and aria label contain no host); `MobileConnectionSheet.spec.ts` (no `mobile-connection-url`; the sheet's text, connected and not reachable with a diagnostic, contains no address); `MobilePairingBootstrap.spec.ts` (QR without name → "AutoByteus node"; `paired` receives `''` for it).
  - Android: `SavedNodeEntryTest` (QR name → known; typed → `null`/label; legacy `displayName == host` → `null`/label); `NodeConnectionFlowTest` (typed open entry named on `paired`; named entry not renamed; typed unusable address → `showCantReach("")`; screens receive `shownName`); `ShellBridgeMessagesTest` (reply includes `nodeName`, empty for unnamed); `ConnectionDiagnosticMapperTest` (an `UnknownHostException("Unable to resolve host \"test-desktop.example-tailnet.ts.net\"…")` gives no host in any text; `pageLoadFailed("Test Desktop")` texts; no function takes a URL).
  - Probe: `mobile-shell-probe.mjs` sheet case asserts no host in the sheet's text.
- SR-003 tests: the load-outcome rule (DS-006) as a JVM test of a small pure decision if the implementation extracts one, otherwise the instrumented smoke test or the emulator cases; emulator (API/E2E): API-08 and API-08b (reload, Back, Retry while down: screenshot shows only the overlay; uiautomator dump has no host/URL), Retry after the node is back closes the overlay (FU-002), the first-load failure stays an overlay, API-03 (MainActivity, AutoByteusWebView, WebShellScreen changed).
- Emulator (API/E2E, AC-009): isolated node, test names, screenshots of the first page, connected page (session without a name, entry named by QR), sheet, Switch node, Can't reach. Rebuild the `/mobile` bundle the node serves as well as the APK (README: a fresh APK alone cannot update stale `mobile-web/` assets).
- `DESIGN.md` rule 11: delete or rewrite tests of removed behavior; keep no production parameter only tests read.
