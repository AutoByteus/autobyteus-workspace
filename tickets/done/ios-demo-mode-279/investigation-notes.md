# Investigation Notes

## Investigation Meta

- Package: `ios-demo-mode-279`; Task autobyteus-279.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279`, branch `codex/ios-demo-mode-279`; base `origin/personal` (fast-forwarded to `8430d9ef12` on 2026-11-19); finalization target `origin/personal`.
- Authorities read: requirements-engineering.md, ticket-scope.md, finding-the-cause.md (requirements); architecture-design.md, design-principles.md, `DESIGN.md` (design), 2026-11-18/19.
- Status: complete; U-003 is verified first in implementation (design R-002).

## Apple's request (User / Contract)

- App Store Connect message, 2026-07-02, iOS 1.3.82 (42), iPhone 17 Pro Max and iPad Air 11-inch. Guideline 2.1(a) "Information Needed", two items:
  - a demo account, or "a demonstration mode that exhibits the app's full features and functionality"; a demo video is "not sufficient";
  - "a demo QR code".
- Screenshots: `evidence/apple-review/`.
- Apple's guideline 2.1(a): a built-in demo mode "with prior approval by Apple"; "placeholder text … should be scrubbed"; apps that "crash or exhibit obvious technical problems" are rejected. "Before You Submit" asks for "a sample QR code". Guideline 4.2: more than a repackaged website.

## Product design and verification

- The Product team's approved specification and visual references (see the requirements' supplements).
- My App Reviewer verification, rounds 1–7: `evidence/demo-verification/verdict.md`, with the sweep scripts (`crawl.mjs`, `sheets.mjs`, `final.mjs`, `upload.mjs`, `share.mjs`) and per-round data. Round 7 is clean.

## Source facts (Read)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-ios/AutoByteusMobile/ConnectionViewController.swift` (219 lines) | The first screen is a URL/cleartext form with diagnostics | Replaced by a UIKit port of Android's start screen (REQ-001) |
| `autobyteus-ios/AutoByteusMobile/*.swift`, `AutoByteusMobileCore/*.swift` (1,790 lines in total) | Small native shell: coordinator, WebView controllers, QR scanner, saved nodes, pairing-link parser, validator | A bounded native change |
| `autobyteus-ios/AutoByteusMobile/Info.plist:28-31` | URL scheme `autobyteus` registered; `NSAllowsArbitraryLoadsInWebContent` true (`:63`) | The demo link reuses the scheme; the notes explain the HTTP exception |
| `autobyteus-ios/AutoByteusMobileShareExtension/ShareViewController.swift:42-87` | Keeps shared text in the app group (`PendingSharedInputStore`); message "Saved for AutoByteus. Open AutoByteus to review and connect…" | Reworked to the specification's messages; the app consumes the text once (REQ-007) |
| `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/{start,connect,sheets}`; `MainActivity.kt:407`; `autobyteus-android/README.md:42` | Android's start screen is classic Android Views (StartScreen, NodeRow, ScanScreen, ConnectingScreen, CantReachScreen, TypeAddressSheet, RemoveNodeSheet); `ACTION_SEND`: a pairing link connects at once, other text pre-fills Type an address | The iOS port follows these screen by screen |
| `autobyteus-web/utils/remoteAccess/shellBridge.ts`; `autobyteus-android/.../web/ShellBridge.kt` | Android gives the node's page `window.AutoByteusShell` (hello, pageReady, paired, showNodeList, startScan, desktopFullScreen, saveFile); iOS has no bridge | iOS gets the same bridge (parity, D1), plus a demo-exit message |
| `autobyteus-web/plugins/30.apollo.client.ts`, `utils/apolloClient.ts` | One Apollo client; `HttpLink` with `fetch: globalThis.fetch`; the endpoint from the window's node binding | The demo node can answer at the fetch seam |
| `autobyteus-web/stores/windowNodeContextStore.ts:49-84` | Every endpoint derives from one node base URL (`deriveNodeEndpoints`) | The demo binds the window to a demo node address |
| WebSocket constructors: `services/agentStreaming/transport/WebSocketClient.ts`, `services/agentOrgExecution/agentOrgStreamingService.ts`, `services/agentCollaboration/agentRunCollaborationStreamingService.ts`, `services/runStatus/runStatusFeed.ts`, `services/nodeChangeFeed/nodeChangeFeed.ts`, `services/fileExplorerStreaming/FileExplorerStreamingService.ts`, `composables/useTerminalSession.ts`, `composables/useVncSession.ts` (noVNC) | Eight socket kinds | The demo node answers each one the phone opens |
| `utils/remoteAccess/authorizedTransport.ts` (`authorizedFetch`), `composables/useAuthorizedObjectUrl.ts` | Files and pictures load through authorized `fetch` and object URLs (no `<img src>` to the node) | A fetch-level demo node covers files and pictures too |
| `graphql/` | 250 named operations in the web app (all surfaces) | The phone's subset is measured (below) |
| Design repository `utils/apolloClient.ts`, `plugins/00.prototype-state.client.ts` (1,134 lines), `prototype/ios-demo/` | The reference fakes the demo by patching stores and answering operations locally | Evidence of coverage only; production stays at the wire (the founder's "100% like the real application") |

## Network inventory of the phone (Measured, 2026-11-19)

- Method: the full phone probe (`env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-web test:e2e:mobile-shell`) on an isolated two-node stack with scripted runtimes, on `8430d9ef12`. A temporary recorder (marked `TEMP autobyteus-279`, removed after the run with `git checkout`) logged every GraphQL operation name, every REST path (IDs normalized) and every WebSocket route with its message types. Output: `evidence/architecture/phone-network-inventory.json`. The probe's only failing case was MSP-41, the known intermittent case (458 FU-003); the recording is complete.
- Result: 43 GraphQL operations (of 250 in the web app); REST `GET /rest/health`, `GET /rest/remote-access/status`, `GET /rest/node-desktop`, `GET /rest/node-files/content`, file-change content, team-message reference content, `POST /rest/remote-access/pairing-exchanges`; WebSocket routes agent, agent-team, agent-org, agent-collaboration, run-status, file-explorer, projects, agent-package-definitions, peer-run; 169 route/direction/type combinations (for example agent in: 19 types, out: SEND_MESSAGE, INTERRUPT_GENERATION, APPROVE_TOOL).
- Contracts available: generated GraphQL types `autobyteus-web/generated/graphql.ts` (`codegen:check`); stream contracts `@autobyteus/agent-presentation-contracts`, `@autobyteus/team-stream-contracts`, `@autobyteus/collaboration-stream-contracts`.

## Unknowns

| ID | Unknown | Resolution |
| --- | --- | --- |
| U-001 | The phone's exact GraphQL / REST / WebSocket surface | Resolved: the inventory above |
| U-002 | VNC View/Control in the demo needs an RFB server in the page | Resolved: the reference uses a 52-line RFB 3.8 server (`autobyteus-web-design/prototype/source-observation/fake-rfb.mjs`); the demo node does the same |
| U-003 | Whether WKWebView serving the bundled build through a scheme handler keeps the page's replaced fetch/WebSocket (Apollo, streams, noVNC) | Not yet run: the design's step 3 starts with a minimal simulator check (R-002) |
