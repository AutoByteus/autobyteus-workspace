# Design Spec — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

## Solution And Approval Basis

- Current solution revision: `SR-002`. SR-001 failed architecture review ARCH-REV-001 (AR-001…AR-003, R-1…R-3); SR-002 resolves them (see Revision SR-002 below).
- Approved requirements: `requirements-doc.md` at SR-001, approved by the founder.
  - His words are recorded there.
  - Engineering mechanism: "Thanks you decide you know the best of the project and what apple required" (2026-11-19), after the demo node was explained to him.
- Behavior-defining supplement: the approved `ui-ux-spec.md` and VIS-001…VIS-037 (design repository, `tickets/done/ios-demo-mode-279/`; reference `78b51f73`).
- Design approval by the user: not required (he delegated it).
- Status: `Ready` for architecture review.
- Investigation: `investigation-notes.md`; network inventory `evidence/architecture/phone-network-inventory.json`.
- Authorities read (2026-11-18/19): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/node_access_model.md` (a phone's credential; the demo has none).
- Project rules applied: `DESIGN.md` rule 9 (no cross-version compatibility; the demo ships with its app), rule 11 (no test-only production code), rule 12 (a gate that reads another package's build output builds it), and the node access model.

## Current-State Read

- **iOS app** (`autobyteus-ios`, 1,790 Swift lines): the native first screen is a URL form (`ConnectionViewController.swift`).
  - A `WKWebView` loads the node's `/mobile` (`WebShellViewController.swift`, `AutoByteusWebViewController.swift`).
  - There is a QR scanner (`QRCodeScannerViewController.swift`) and a share extension that keeps shared text in the app group (`ShareViewController.swift:42-87`, `PendingSharedInputStore`).
  - There is no shell bridge, no demo, and no bundled web content.
- **Android** has the scan-first start screen in classic Views (`ui/start`, `ui/connect`, `ui/sheets`), `ACTION_SEND` handling (`MainActivity.kt:407`) and the shell bridge `window.AutoByteusShell` (`web/ShellBridge.kt`, `autobyteus-web/utils/remoteAccess/shellBridge.ts`).
- **The phone screens** (`autobyteus-web`, built by `build:mobile-web` into `dist-mobile/public`) reach a node only through these:
  - one Apollo client (`plugins/30.apollo.client.ts`: `HttpLink` with `fetch: globalThis.fetch`, the endpoint from `windowNodeContextStore` → `deriveNodeEndpoints`);
  - `authorizedFetch` for REST, files and pictures, shown as object URLs (`utils/remoteAccess/authorizedTransport.ts`, `composables/useAuthorizedObjectUrl.ts`);
  - `new WebSocket(...)` in the stream services and in noVNC (`composables/useVncSession.ts`).
- **Measured inventory of what the phone uses** (`evidence/architecture/phone-network-inventory.json`), recorded from the full phone probe on an isolated stack:
  - 43 GraphQL operations;
  - REST: `GET /rest/health`, `GET /rest/remote-access/status`, `GET /rest/node-desktop`, `GET /rest/node-files/content`, `GET /rest/team-runs/:id/agent-runs/:id/file-change-content`, the team-message reference content, and `POST /rest/remote-access/pairing-exchanges` (pairing only, not in the demo);
  - WebSocket routes `/ws/agent/:id`, `/ws/agent-team/:id`, `/ws/agent-org/:id`, `/ws/agent-collaboration/:id`, `/ws/run-status`, `/ws/file-explorer/:id`, `/ws/projects`, `/ws/agent-package-definitions`, `/ws/peer-run/…` (a peer's run, not in the demo), plus the node-desktop VNC socket;
  - 169 route × direction × message-type combinations.
- **Contracts to answer with:** the generated GraphQL types (`autobyteus-web/generated/graphql.ts`, checked by `codegen:check`) and the stream contract packages (`@autobyteus/agent-presentation-contracts`, `@autobyteus/team-stream-contracts`, `@autobyteus/collaboration-stream-contracts`).

## Task Size And Architectural Risk (Mandatory)

- `task_size = Large`.
  - A new web subsystem: the demo node (the GraphQL answers, the stream sessions, the sample world, a scripted runtime, an RFB endpoint).
  - A separate phone build.
  - A native start screen port.
  - The shell bridge on iOS.
  - A demo web view.
  - The share extension rework.
  - The iPad layout.
  - Two real-app changes (DC-007, DC-011).
  - Bundled icons.
  - The iOS release build step.
- `architectural_risk = High`.
  - It adds a new contract consumer, the demo node, that answers the node's protocol, and a new build artifact.
  - It adds an iOS web-content boundary (a bundled origin with no network).
  - It changes the iPad layout of the real phone shell.
  - It is App Review-critical.
- Escalation trigger: anything that needs a change of the node's protocol, or of the phone code's transport seams beyond the adapter named below, goes back to the Solution Designer as a `Design Impact`.

## Intended Change

The demo is the real phone build running against a **demo node** inside the page. The demo node is a module, compiled only into a separate demo build of the phone screens, that answers the node's own protocol from a sample world on the device.

The iOS app bundles that build. When the user taps Try demo, scans the demo code or opens `autobyteus://demo`, the app opens it in a web view that has no network access.

Everything the user sees is the shipped phone code (stores, screens, streams), unchanged. Only the transport has nobody on the other end except the demo node. The iOS shell gains Android's start screen, its shell bridge and its share handling. The phone shell gains the iPad layout, DC-007, DC-011 and locally bundled icons, for real use too.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005; the subsystems below.
- Derived consumers: the demo node consumes the GraphQL schema (the generated types) and the stream contracts. When either changes, the demo's type check and contract tests fail, so they cannot drift silently (QR-003).
- Deliberately left alone:
  - the node (server);
  - the node's `/mobile` build: it contains no demo code;
  - Android (D5);
  - the desktop, except DC-007, which lives in the shared conversation feed.
- Follow-ups:
  - FU-001: a top-level row learns its background tasks only after the run is opened (real app; Product's candidate).

## Spines

| Spine | Start | End | Owner |
| --- | --- | --- | --- |
| DS-001 Open the demo | Try demo / demo code / `autobyteus://demo` | the demo run list with the welcome card | iOS `AppShellCoordinator` → `DemoWebViewController` → web `demoBoot` |
| DS-002 A demo request | a phone store's GraphQL / fetch / WebSocket call | the answer from the sample world | web `demoTransport` → `DemoNode` |
| DS-003 A scripted turn | `SEND_MESSAGE` on a demo stream | streamed segments, a tool call, the closing line, Idle | `DemoNode.runtime` |
| DS-004 Leave demo | the demo sheet's Leave demo | the iOS first screen, the demo forgotten | web `shellBridge.leaveDemo()` → iOS coordinator |
| DS-005 Share | another app's share | the app acts on the kept text once | share extension → app group → `AppShellCoordinator.consumePendingShare()` |
| DS-006 iPad layout | viewport ≥ 768 / ≥ 1024 px | cards / two panes | `MobilePairedShell`, `MobileBottomSheet` |

- DS-001: `StartViewController (Try demo) | ScanViewController (code autobyteus://demo) | SceneDelegate (openURL) → AppShellCoordinator.openDemo() → DemoWebViewController (bundled demo build, no network) → demoBoot, the first client plugin (installs the demo transport, starts the world, saves the demo session; plugin 21 then binds the window to the demo node through the session store) → MobileRemoteAccessShell (the normal phone shell) → run list`.
- DS-002: `phone store → Apollo HttpLink / authorizedFetch / new WebSocket → demoTransport (the page's fetch and WebSocket for the demo origin only) → DemoNode.graphql | rest | streams → DemoWorld → typed answer`.

## Ownership Map And Subsystems

### Web: the demo node (`autobyteus-web/demo/`, compiled only into the demo build)

| File | Owns |
| --- | --- |
| `demo/plugins/00.demoBoot.client.ts` (outside `plugins/`, because Nuxt registers that folder automatically; `nuxt.config.ts` adds it to `plugins` only when `AUTOBYTEUS_DEMO_BUILD=1`, N-3) → `demo/demoBoot.ts` | The demo build's first client plugin, before `20.windowNodeBootstrap`, `21.mobileRemoteAccessBootstrap` and `30.apollo` (AR-001). In this order: (1) `installDemoTransport` (so plugin 30's `HttpLink` captures the demo `fetch`); (2) a fresh `DemoWorld`; (3) the phone's session through its owner's storage: `mobileCredentialStorage.save(DEMO_SESSION)` with `entryId: DEMO_ENTRY_ID` (`'demo'`), `serverBaseUrl: DEMO_ORIGIN` (`https://demo.autobyteus.invalid`, never resolvable), `nodeName: 'Demo'`, `credential: DEMO_SESSION_TOKEN` (`'demo-session'`, a non-secret token that only the demo node accepts; never a node credential) and the device summary. Plugin 21 then loads and binds it as for any paired phone (`mobileSessionBootstrap.ts:5-13` → `bindSession` → `bindNodeContext`, `mobileNodeSessionStore.ts:117-121`), and the shell shows the run list (`MobileRemoteAccessShell.vue:4`). The storage is the web view's non-persistent data store, so the session ends with Leave demo or a cold launch (REQ-006). |
| `demo/demoTransport.ts` | The network boundary. `fetch` and `WebSocket` to the demo origin go to the `DemoNode`. The page's own origin (`autobyteus-demo://app`: the bundled build and Nuxt's app manifest `_nuxt/builds/meta/*.json`, `latest.json`, `nuxt.config.ts:131-132`), `blob:` and `data:` pass through to the real `fetch` (AR-002). Every other origin, any `http(s)`/`ws(s)` network address, is refused with a `TypeError`, as an offline fetch is, so the demo cannot reach the network. The adapter of a real boundary (Principle 13). |
| `demo/DemoNode.ts` | Dispatch: GraphQL by `operationName` → `demo/graphql/*`; REST by method and path → `demo/rest/*`; WebSocket by route → `demo/streams/*`. An unknown operation or route is a loud error (it logs and returns a GraphQL error), caught by the sweep and the contract test, never a silent empty answer. |
| `demo/graphql/*.ts` | One file per subject (runs and history, teams, orgs, definitions, files, models and runtimes, settings, tasks): all 43 operations of the inventory (`PhoneCredentialCheck` answers the demo's session as valid; `CreateWorkspace` and `PrepareAgentRun` create in-memory runs). Every answer is typed with the generated result type of its operation (`generated/graphql.ts`). |
| `demo/rest/*.ts` | `health`, `remote-access/status` (the demo node's identity "Demo"), `node-desktop` (available, view), file content, file-change content, message references: bytes from the world's files. |
| `demo/streams/*.ts` | One session class per route (agent, agent-team, agent-org, agent-collaboration, run-status, file-explorer, projects, agent-package-definitions, node-desktop). Each message is built with, and validated by, the contract packages' schemas. |
| `demo/streams/rfbServer.ts` | A minimal RFB 3.8 server: no authentication, one frame of a sample desktop; View only and Control (input ignored). |
| `demo/world/*.ts` | The sample world (REQ-004): definitions, runs (agent, Team, Org, delegated), conversations as presentation segments, files and pictures (bundled under `demo/world/files/`), artifacts, messages, activity, background tasks, sample models. Created fresh on each start; nothing is persisted. |
| `demo/runtime.ts` | Scripted behavior: a send acknowledges, sets Running, a tool call (`read_file` of the run's main file, or `list_directory` of `demo-workspace`), streams the answer in 3-word steps of 70 ms, ends with the exact closing line, then Idle. Also Stop (Idle in about 0.3 s, or "Background task running"), a member's reply, a new run, an attached file named in the reply, and a Settings Save kept in memory. |

### Web: the phone shell (all builds)

| File | Change |
| --- | --- |
| `utils/remoteAccess/shellBridge.ts` | Adds `leaveDemo()`. The bridge contract is shared by Android and iOS; Android does not use it. |
| `components/mobile/runList/MobileRunList.vue`, `components/mobile/connection/MobileConnectionSheet.vue` | When the phone's session is the demo session (`mobileNodeSessionStore.session.entryId === DEMO_ENTRY_ID`, one owner: the session that `demoBoot` stores; R-3, no status field is added to the node's contract), they show the demo node button ("Demo / Sample data", sparkles), the welcome card and the demo sheet with Leave demo. `DEMO_ENTRY_ID` lives in `utils/remoteAccess/demoSession.ts` (all builds), so the shell needs no `demo/` import. |
| `components/mobile/MobilePairedShell.vue`, `components/mobile/MobileBottomSheet.vue` | iPad: cards from 768 px; two panes from 1024 px (380 px list, "Choose a run", no ← on the run screen); rotating keeps the open run (REQ-008). |
| `components/workspace/agent/AgentConversationFeed.vue` | DC-007: your own send scrolls to your message and follows the reply (REQ-009). |
| `components/workspace/agent/ArtifactContentViewer.vue`, `components/mobile/views/MobileArtifacts.vue` | DC-011: read only on the phone (REQ-010). |
| `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs`, generated `assets/icons/phone-icon-bundle.json` | Every Iconify collection the phone uses is registered locally at start (AR-003): Heroicons, `mdi` (`ThinkSegment.vue:4,7`), `vscode-icons` (`referenceFilePresentation.ts` used by `MobileMessages` and `MobileTeamReferenceViewer`; `ArtifactItem.vue`) and `svg-spinners` (`ArtifactItem.vue:8`). The script builds a subset from the names in the source, including every name that `referenceFilePresentation.ts` and `ArtifactItem.vue` can compute (their mapping tables). The Iconify API is disabled, so a missing name fails loudly instead of fetching. A test fails if an icon name in the source or a mapping table does not resolve from the bundle. In every build (REQ-011). |
| `scripts/build-mobile-web.mjs` | Adds a `--demo` target that builds `dist-mobile-demo/public` with the `demo/` entry and `AUTOBYTEUS_DEMO_BUILD=1`. The regular `/mobile` build stays without `demo/`, so a node never serves the demo, and `demo/` is excluded by a build guard test. |

### iOS (`autobyteus-ios`)

| File | Change |
| --- | --- |
| `AutoByteusMobile/Start/StartViewController.swift` (+ `NodeRowView`, `TypeAddressSheet`, `RemoveNodeSheet`) | A port of Android's start screen (UIS-001): hero or Your nodes, Other ways to connect, Scan, Try demo. A centered 448 pt column on iPad. Replaces `ConnectionViewController.swift` (removed). |
| `AutoByteusMobile/Connect/{ConnectingViewController,CantReachViewController}.swift` | Ports of Android's ConnectingScreen and CantReachScreen. |
| `AutoByteusMobile/QRCodeScannerViewController.swift` | The code `autobyteus://demo`: green corners, "Demo code found", then the demo after 0.7 s. Other codes are unchanged. |
| `AutoByteusMobile/Demo/DemoWebViewController.swift` | A `WKWebView` loading `dist-mobile-demo/public` (bundled as `DemoWeb/`) through a `WKURLSchemeHandler` for `autobyteus-demo://app/`. A `WKContentRuleList` blocks every `http(s)` and `ws(s)` load, a second guard behind `demoTransport`. A new non-persistent `WKWebsiteDataStore` on each open, so nothing survives Leave demo or a cold launch (REQ-006). |
| `AutoByteusMobile/Shell/ShellBridgeHandler.swift` | `window.AutoByteusShell` for both node pages and the demo, with Android's contract (`hello`, `pageReady`, `paired`, `showNodeList`, `startScan`, `desktopFullScreen`, `saveFile`) plus `leaveDemo`, handled through a `WKScriptMessageHandler` for the main frame of the open origin only. It carries no credential. |
| `AutoByteusMobile/AppShellCoordinator.swift`, `SceneDelegate.swift` | Routes: start → connecting → node page; start → demo; `openURL autobyteus://demo` → demo; on becoming active, `consumePendingShare()`, used once (REQ-007): a pairing link connects (`PairingLinkParser`), the demo link opens the demo, other text opens Type an address pre-filled; a share arriving in the demo leaves the demo. |
| `AutoByteusMobileShareExtension/ShareViewController.swift` | The specification's sheet and its four messages (UIS-016). |
| `project.yml`, `scripts/` | Copies `dist-mobile-demo/public` into the app as `DemoWeb/`; the build fails if it is missing. |
| `.github/workflows/*ios*` | The iOS gate's own prepare step builds `autobyteus-web` `build:mobile-web --demo` from `pnpm install` (DESIGN.md rule 12). |

## Interfaces

```ts
// demo/demoTransport.ts — the only place that touches the page's network primitives, only in the demo build (SR-002).
export const installDemoTransport = (node: DemoNode, demoOrigin = DEMO_ORIGIN): void => {
  const realFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), location.href)
    if (url.origin === demoOrigin) return node.http(new Request(input, init))
    if (url.origin === location.origin || url.protocol === 'blob:' || url.protocol === 'data:') return realFetch(input, init)
    return Promise.reject(new TypeError('Offline'))           // any other network origin (AR-002)
  }
  globalThis.WebSocket = class extends DemoSocket {            // only the demo origin; anything else closes as unreachable
    constructor(url: string | URL) { super(node.stream(new URL(String(url), location.href))) }
  } as typeof WebSocket
}
// demo/demoBoot.ts (run by the demo build's first client plugin): installDemoTransport → new DemoWorld → mobileCredentialStorage.save(DEMO_SESSION).
// DemoNode.graphql: Record<OperationName, (variables, world) => ResultOf<Operation>> — typed with generated/graphql.ts.
```

Other network origins are refused; the page's own origin (the bundled build through the scheme handler), `blob:` and `data:` use the real `fetch`.

## Removal / Decommission Plan

- `ConnectionViewController.swift`, and the old shared-input notice card it shows, are replaced by the start screen.
- The share extension's old message (`ShareViewController.swift:82`) is replaced.
- The remote Iconify fetch path (implicit) is replaced by local registration.

## Persisted Data

- Saved computers on iOS (revised in SR-003, CRR-002 F-1): `Migration Required` for one field, `displayName`. Every other field is directly usable.
  - Writers before this change:
    - The shipped app saved `displayName: status.serverName` after a status check (`8430d9ef12:autobyteus-ios/AutoByteusMobile/AppShellCoordinator.swift:134`).
    - `ConnectionValidator` fills `serverName` with the literal `"AutoByteus Desktop"` when the node's status has no name (`ConnectionValidator.swift:30,34`).
    - So for entries saved by the shipped app, `"AutoByteus Desktop"` means "no name known". Its other writer, the pairing link (`PairingLinkParser.swift:50,110`), stores the link's own name, a real name.
  - Reader after this change: the Names rule below (SR-004): `knownName` decides "no known name"; the placeholder must not reach it.
  - Why a migration: a stored value with a second meaning (Principles 5 and 15). Recognising the string at run time in the flow or the bridge would be a version-specific fallback (Principle 8).
  - Mechanism: `AutoByteusMobileCore/DataMigrations/SavedNodeDisplayNamePlaceholderMigration.swift`, the existing iOS migration owner beside `SavedNodeEntryKeysMigration`. `AppShellCoordinator` runs it at app start, after the key migration and before `SavedNodeStore` is created (`AppShellCoordinator.swift:25-26`).
    - For each saved entry whose `displayName` is exactly `"AutoByteus Desktop"`, it sets `displayName` to that entry's host, the current "no known name".
    - The entries array as it was is kept under `autobyteus.saved-node-entries:before-display-name-placeholder` until the next start that finds the completion marker `autobyteus.migrations.saved-node-display-name-placeholder = done`; that start removes the backup.
    - Restart safety: see the write order below (N-4).
    - The old literal lives only in this file.
  - Write order (N-4): (1) the backup of the entries array as it was; (2) the rewritten entries; (3) the completion marker. A start that finds the backup without the marker restores the entries from the backup and runs again, so any interruption is covered.
  - Accepted effect (corrected in SR-004, AR-004): the page sends `paired` only right after a pairing exchange (`MobilePairingBootstrap.vue:134`), so opening an already-paired computer does not rename it. A migrated entry therefore has no native name until it is paired again: the native screens show it as "AutoByteus node" (never its address, below), and its run list shows the page's own pairing name (`hello.nodeName` is `""`). Pairing it again (its QR) names it natively, as on Android. A computer really named "AutoByteus Desktop" is affected the same way.
  - `ConnectionValidator`'s default: after the change nothing reads `serverName` for naming. Implementation checks its readers and removes the field and its placeholder if none remain (Principle 7), or keeps it with its reader named.
- Names, one rule as on Android (SR-004, AR-004; Android `connection/SavedNodeEntry.kt:27-34`, `ui/start/NodeRow.kt:48`, `web/ShellBridge.kt:64,161`). `SavedNodeEntry` (iOS Core) gives:
  - `knownName: String?`: `displayName` trimmed, or `nil` when it is empty or equals `host` (ignoring case). This is "the node's name from its QR or its page's pairing".
  - `shownName: String`: `knownName ?? "AutoByteus node"`. Never an address.
  Who reads which:
  - `NodeConnectionFlow` (whether a pairing renames the entry; the old `hasKnownName`, `:128`, removed) and the bridge's `hello.nodeName` (`knownName ?? ""`, `WebShellViewController.swift:45`) use `knownName`.
  - Every native label uses `shownName`: the start screen's row (`NodeRowView.swift:38,57,92`), the Remove sheet (`RemoveNodeSheet.swift:24,51`), Connecting and Can't reach (`NodeConnectionFlow.swift:134,143`).
  - No native view reads `displayName` directly. A unit test checks that `shownName` never returns a host or an address, and an architecture or lint check finds no `.displayName` read in `AutoByteusMobile/Start`, `Connect` or the flow's screen calls.
- The share handoff: the existing app-group key, consumed once.
- The demo persists nothing: a non-persistent data store, and a fresh world on each start.

## Dependency Rules

- Only `demo/demoBoot.ts` imports `demo/`, and only in the demo build entry. No product file imports `demo/` (a lint or architecture test).
- `demo/` depends on the generated GraphQL types, the contract packages and the phone stores' public types; it never patches a store.
- iOS: the demo web view never receives a node credential, and the coordinator never stores the demo as a saved node.

## Verification Plan (maps to AC-001…AC-011)

- **Web, demo build:**
  - The Solution Designer's sweep becomes durable probe cases (`autobyteus-web/tests/e2e/mobile-demo-*.mjs`). They cover `crawl.mjs`, `sheets.mjs`, `final.mjs`, `upload.mjs` and `share.mjs` (the web half), run against `dist-mobile-demo/public` in Chrome at 440×956, 820×1180 and 1180×820, and fail on any finding, console error or external request (AC-003, AC-004, AC-007).
- **Contract tests:**
  - Every operation and route in `phone-network-inventory.json` has a demo handler; and every GraphQL operation name compiled into `dist-mobile-demo/public` (R-2: the bundle's own operations, a second oracle besides the probe inventory) has one, or is listed as unreachable on the phone with its reason.
  - Every icon name in the source and mapping tables resolves from the local bundle (AR-003).
  - Every demo stream message passes its contract schema.
  - Every GraphQL answer satisfies its generated type (`tsc`).
  - `demo/` is absent from the node's `/mobile` build.
- **Real app:** DC-007 and DC-011 unit and probe tests; the full phone probe stays green (AC-008, AC-011).
- **iOS:** XCUITests on the iPhone 17 Pro Max and iPad Air 11-inch simulators:
  - the start screen against a test node: QR (injected), Paste a link, Type an address, and a saved computer opening;
  - Try demo; `simctl openurl autobyteus://demo`;
  - Leave demo; a cold launch;
  - the four share cases;
  - rotation;
  - no request leaves the web view (`WKContentRuleList` hits and the page log) (AC-001, AC-002, AC-005, AC-006, AC-009).
- **Device check (TestFlight on the founder's word):** the real camera scan of the printed demo QR, the Camera app link, airplane mode, and the review notes walked as written (AC-002, AC-003, AC-010).
- **The Solution Designer's own App Reviewer sweep on the build** before anything goes to Apple (REQ-012).

## Task Design Health Assessment

- Change posture: `Larger Requirement`.
- Structural triggers that fire, and the response to each:
  - **Several kinds or forms:** 43 operations and 9 stream routes. The response: per-subject files with a dispatch table checked against the measured inventory.
  - **Capability-area reuse:** the existing contracts and generated types are reused; there is no hand-written protocol copy.
  - **Empty indirection:** `demoTransport` is the adapter at a real boundary (the page's network), not a forwarder.
  - **Derived data:** the world is the one owner of the demo state; every answer is derived from it.
- Root cause classification: `No Design Issue Found` (new capability).
- Refactor needed now: `No`, beyond replacing the iOS first screen.

## Change Sequence

1. Web: `demo/plugins/00.demoBoot.client.ts` and `demo/` (transport, session, dispatch, world, runtime, streams); the `--demo` build target; the local icon bundle; the contract tests; the sweep probe (red until complete).
2. Web shell: the demo identity UI, the iPad layout, DC-007, DC-011, local icons; the full phone probe green.
3. iOS: the start screen port, the scanner demo code, the shell bridge, `DemoWebViewController`, the URL route, the share handoff; XCUITests.
4. The iOS build step and workflow prepare (rule 12): a build-only run of the iOS workflow on the branch before merge (RELEASE.md).
5. The Solution Designer's sweep on the simulator build; then, on the founder's word, TestFlight and the device check.

## Risks

- R-001: protocol drift as the phone grows. Mitigated by the typed answers, the contract schemas and the inventory test. A new phone operation without a demo handler fails the sweep loudly.
- R-002 (premise to verify, not yet run; widened by R-1): with a minimal simulator build of the demo web view, before porting the rest, check:
  - the page's replaced `fetch` and `WebSocket` serve Apollo, the stream services and noVNC (which constructs its socket from `window.WebSocket` at connect time);
  - `isSecureContext` and `crypto.randomUUID` on the `autobyteus-demo://` scheme (or register it as secure);
  - module scripts and dynamic imports load with JavaScript MIME types from the scheme handler;
  - deep paths fall back to `200.html`;
  - `localStorage` works in the non-persistent data store and is empty on the next open.
  If one fails, return a `Design Impact`.
- R-003: Apple's "prior approval" for demo modes. The reply goes with the resubmission (the founder's word).
- R-004: App size. The demo build adds roughly the size of the phone bundle plus the sample files (measure at step 1, and keep the sample pictures small).

## Guidance For Implementation

- Reproduction and evidence to start from: the measured inventory, and the Solution Designer's sweep scripts in `evidence/demo-verification/` (`crawl.mjs`, `sheets.mjs`, `final.mjs`, `upload.mjs`, `share.mjs`). Point them at the demo build instead of the design reference.
- The design reference (`autobyteus-web-design`, `78b51f73`) shows the intended content and timings; its store patching is not prescriptive.
- Isolated nodes and scripted runtimes only for the real-node tests. Nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word.

## Revision SR-002 (ARCH-REV-001)

| Finding | Resolution | Sections changed |
| --- | --- | --- |
| AR-001 (High): no owner for the phone's session; no start order | `plugins/00.demoBoot.client.ts` runs first: the transport, the world, then a demo `MobileNodeSession` through `mobileCredentialStorage`, which plugin 21 binds as for any paired phone. A non-secret `DEMO_SESSION_TOKEN` that only the demo node accepts; non-persistent storage. | Ownership (demoBoot), Interfaces |
| AR-002 (Medium): the transport refused the page's own fetches (the Nuxt app manifest) | The page origin, `blob:` and `data:` pass through; only other network origins are refused | Ownership (demoTransport) |
| AR-003 (Medium): icons beyond Heroicons | A generated local subset of Heroicons, mdi, vscode-icons and svg-spinners; the API disabled; a resolution test over the source and mapping tables | Ownership (icons), Verification |
| R-1 | The first simulator check widened (secure context, randomUUID, module MIME types, 200.html, non-persistent localStorage) | Risks R-002 |
| R-2 | The demo bundle's compiled operations are a second coverage oracle | Verification |
| R-3 | "This is the demo" has one owner: the demo session's `entryId`; no status field is added to the node contract | Ownership (run list, sheet) |

Classification unchanged: `Large` / `High`.

Editorial after ARCH-REV-002 (Pass), no design change: the Interfaces snippet, the DS-001 chain and the demo plugin's location (`demo/plugins/`, N-3) now match the Ownership rows.

## Revision SR-003 (CRR-002, Design Impact)

| Finding | Resolution |
| --- | --- |
| F-1 part 1 (persisted data): the shipped app's placeholder `"AutoByteus Desktop"` in `displayName` was read as a real name | `Migration Required` for `displayName`: `SavedNodeDisplayNamePlaceholderMigration` (the existing iOS migration owner), with a backup, a completion marker and a restart rule; the validator's default removed if unread |
| F-1 part 2 (ported contract): `hello` sent `displayName`, so a typed-address entry sent its host | One rule, `SavedNodeEntry.knownName`, for the flow and `hello` (`""` when no known name), as on Android |

- Design case added to `docs/design-cases.md` (Case 24).
- Verification added: a unit test of the migration (a placeholder entry rewritten to its host; a pairing-link name kept; a second run unchanged; an interruption after each write step restored from the backup); API-04a/b after an update over the shipped app: the run list's node button shows "Test Node 279" (the page's pairing name), the start screen's row shows "AutoByteus node", and a re-pair names the row "Test Node 279"; a new pairing (QR, Paste a link) names the row; a typed address shows "AutoByteus node" and `hello.nodeName == ""`; unit tests that `shownName` never shows an address.
- Classification unchanged: `Large` / `High`.

## Revision SR-004 (ARCH-REV-003, AR-004 and N-4)

| Finding | Resolution |
| --- | --- |
| AR-004: native labels showed a migrated entry's address; the promised rename on open does not happen | `SavedNodeEntry.knownName` / `shownName` as on Android; the flow and `hello` use `knownName`, every native label uses `shownName` ("AutoByteus node", never an address); Accepted effect and Case 24 corrected (a native name comes with the next pairing; the run list shows the page's pairing name meanwhile); API-04b's expectations restated |
| N-4 | The migration's write order stated: backup, rewritten entries, marker |

The migration (SR-003) and the ARCH-REV-002 rulings stand. Classification unchanged: `Large` / `High`.

Editorial after ARCH-REV-004 (Pass), no design change: the superseded SR-003 reader bullets and "one write pass" sentence replaced by references to the Names rule and the write order (N-5).
