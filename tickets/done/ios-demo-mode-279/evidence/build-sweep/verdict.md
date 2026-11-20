# App Reviewer sweep on the built iOS demo — autobyteus-279 (REQ-012), 2026-11-20

- By: Solution Designer, before anything goes to Apple (my promise to the founder; REQ-012).
- Build swept:
  - **web:** the demo bundle `autobyteus-web/dist-mobile-demo/public` (integrated state `0e58926e03`; the pushed branch `a46471f61a` differs only in docs and `.gitleaks.toml`), served as the app's scheme handler serves it (`tests/e2e/fixtures/demo-build-server.mjs`) and swept in Chrome;
  - **native:** a **Release** simulator build of the worktree (`xcodebuild … -configuration Release -sdk iphonesimulator`, `/tmp/abt279b-dd`), and the app's UI tests (`DemoUITests`, `DemoIPadUITests`) on simulators of my own (iPhone 17 Pro Max and iPad Air 11-inch (M3), iOS 26.1).

## Results

| Check | Result |
| --- | --- |
| `crawl.mjs` (every run row, every ⋮ entry, the first files) at 440×956, 1180×820, 820×1180 | 40 rows each, **0 findings, 0 console errors, 0 external requests**; every member row opens its own run |
| `sheets.mjs` (every Runtime and Model option, New run and a stopped run's Settings, Refresh models) | sample models only (AutoByteus 2, Codex 3, Claude 1), 0 errors |
| `upload.mjs` (attach a file and send) | the reply reads "I read sample.txt.", 0 errors |
| `vnc.mjs` (VNC View only → Control) | Control with Keyboard and Clipboard, 0 errors (the design-stage "Disconnection timed out." is gone) |
| Release build, first launch (`screens/n01-first-launch.png`) | the approved scan-first screen, Scan and Try demo; the hint says "press Show QR code" as Android does and as the desktop's button reads (the specification's "choose Connect a phone" is out of date; the build is right) |
| `autobyteus://demo` from outside (`screens/n02-demo-link.png`) | iOS's own "Open in AutoByteus?" prompt (normal for a link from outside) |
| `DemoUITests` on iPhone, 5 runs (1 on a newly created simulator, then 1 plus 3 on freshly erased ones), plus 2 single reruns of the share test | Try demo → Leave demo → cold launch, scanning the demo code, the demo link, the network block, the first screen: all pass every run. The kept-share test: **1 failure in 9 runs**, the very first run on a newly created simulator (the app stayed on its start screen for the 97 s wait); the other 8 pass in about 10 s. One extra run failed before testing because the simulator could not install the test runner (environment). |
| `DemoUITests` and `DemoIPadUITests` on iPad Air | 7/7 pass, iPad landscape included |

## Verdict

**The built demo passes my App Reviewer sweep.** Everything a reviewer can reach responds, with no placeholder, no error and no network request, on iPhone and iPad.

## Residual risks (not blocking)

- **R-1, the kept share at the first launch (1/9, not reproduced).** The share is consumed when the app becomes active and opens the demo asynchronously (`SceneDelegate.swift:22-23`, `AppShellCoordinator.swift:68-71`). Its only failure was the first run on a brand-new simulator. Recorded for the real-iPhone check: share the demo link from Safari, then open AutoByteus.
- **R-2, what simulators cannot prove** (REQ-012 items 3–5): the real camera scan of the printed demo QR, the Camera app's link, airplane mode on a device, and the review notes walked on a device. These need the TestFlight build on the founder's word.

## Reproduce

- `node serve.mjs` serves the demo build; then, with `DEMO_BASE=<printed address>`: `node crawl.mjs 440 956 iphone`, `node sheets.mjs`, `node upload.mjs`, `node vnc.mjs`.
- UI tests: `xcodebuild -project autobyteus-ios/AutoByteusMobile.xcodeproj -scheme AutoByteusMobile -destination 'id=<sim>' -only-testing:AutoByteusMobileUITests/DemoUITests test` (and `DemoIPadUITests` on an iPad). The run summaries are the `*.summary.txt` files here.
