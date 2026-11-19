# R-002 premise check: Pass (iPhone 17 Pro Max and iPad Air 11-inch (M3) simulators, iOS 26.1)

- **id:** IMP-279-R002
- **command:** `evidence/implementation/r002/run.sh autobyteus-web <work dir> ["<device type>"]`. It builds `page/` with Vite from autobyteus-web's own `@apollo/client` and `@novnc/novnc`, generates the `ios/` harness with XcodeGen, and runs it on a simulator created for the run and deleted after it.
- **commit:** `8430d9ef12` (base; no product change)
- **date:** 2026-11-19
- **machine:** load average about 275–363 (other processes)

## What the harness is

- **The page:** `page/main.js`, test only. It installs a `demoTransport` like the design's, then runs each check and reports it.
- **The app:** `ios/R002Harness/R002Harness.swift`. It hosts the page as `DemoWebViewController` will:
  - a `WKURLSchemeHandler` for `autobyteus-demo://app/` over the bundled build, giving JavaScript MIME types and falling back to `200.html` for paths with no file;
  - a `WKContentRuleList` that blocks `^(https?|wss?)://`;
  - a new `WKWebsiteDataStore.nonPersistent()` per open.
- **Two opens:** run 1 opens the deep path `/deep/path/run`; run 2 opens `/` in a second web view with a new store.

## Results

| Check | Run 1 | Run 2 |
| --- | --- | --- |
| Module script runs | ✓ | ✓ |
| `isSecureContext` on `autobyteus-demo://` | ✓ `true` | ✓ |
| `crypto.randomUUID` | ✓ | ✓ |
| Dynamic `import()` (handler MIME `text/javascript`) | ✓ | ✓ |
| Deep path falls back to `200.html` (`/deep/path/run`) | ✓ | — |
| `localStorage` works in the non-persistent store | ✓ | — |
| `localStorage` empty in a new non-persistent store | — | ✓ |
| The page's own origin through the transport (`/meta/latest.json`, status 200, `application/json`) | ✓ | ✓ |
| `blob:` and `data:` through the transport | ✓ | ✓ |
| Another origin refused by the transport (`TypeError: Offline`) | ✓ | ✓ |
| The real `fetch` beneath, blocked by the content rule list (`TypeError: Load failed`) | ✓ | ✓ |
| Apollo `HttpLink` (fetch captured at creation, as `plugins/30.apollo.client.ts`) answered by the demo node | ✓ | ✓ |
| A stream socket: `new WebSocket`, `addEventListener('message')` and `onmessage` both delivered | ✓ | ✓ |
| noVNC `RFB` over a socket the page built (as `useVncSession.ts`): `connect`, one Raw frame painted (pixel 224,122,60) | ✓ | ✓ |

Results: `results/iphone-17-pro-max.json`; the files the scheme handler served: `results/iphone-17-pro-max-served.txt`.

## A constraint found for `demoTransport`

**The first run failed noVNC:** "Raw channel missing property: send".

noVNC's `Websock.attach` (`@novnc/novnc/core/websock.js`) looks for `send`, `close`, `binaryType`, `on*`, `protocol` and `readyState` among the socket's own keys and its *immediate* prototype's own names. The harness installed `globalThis.WebSocket = class extends DemoSocket`, so `send` sat on the grandparent prototype.

Installing the class that defines the methods itself (`globalThis.WebSocket = DemoSocket`, the origin check in its constructor) passes.

The design's Interfaces sketch shows `class extends DemoSocket`. The implementation installs the defining class instead, which is the same boundary; the design is unchanged.

## iPad Air 11-inch (M3)

All checks pass in both runs (`results/ipad-air-11.json`).

- **First attempt:** the app never started within 15 minutes at a load average of about 300–360.
- **Retry:** finished within 9 s of launch.

**Note for the iPad layout:** on iPad the web view reports a desktop user agent (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15`), which is WKWebView's default desktop-class browsing. The phone shell's layout must follow the viewport width (REQ-008's breakpoints), never the user agent.
