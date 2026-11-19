# Implementation Handoff — ios-demo-mode-279 (autobyteus-279): the iOS app's built-in demo for App Review

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279`, branch `codex/ios-demo-mode-279`, base `origin/personal` `8430d9ef12`. Ticket folder `tickets/in-progress/ios-demo-mode-279/` (paths below are relative to the worktree unless absolute).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High); ARCH-REV-002 `Pass` on SR-002. Implementation hands off to Code Review (Large/High rule).
- Requirements doc: `tickets/in-progress/ios-demo-mode-279/requirements-doc.md` (REQ-001…014, AC-001…011; approved by the founder).
- Investigation notes: `tickets/in-progress/ios-demo-mode-279/investigation-notes.md`; network inventory `evidence/architecture/phone-network-inventory.json`.
- Solution revision record: `tickets/in-progress/ios-demo-mode-279/solution-revision-record.md` (SR-002).
- Design spec: `tickets/in-progress/ios-demo-mode-279/design-spec.md` (SR-002, with N-1…N-3 applied).
- Supplemental task artifacts: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/ios-demo-mode-279/ui-ux-spec.md` with VIS-001…037 (reference `78b51f73`); `product-design-request.md`; the Solution Designer's sweep scripts in `evidence/demo-verification/`.
- Design review report: `tickets/in-progress/ios-demo-mode-279/design-review-report.md`.
- Architecture review revision record: `tickets/in-progress/ios-demo-mode-279/architecture-review-revision-record.md`.
- Triggering rework report: N/A (initial implementation).
- Running build record kept during the work: `tickets/in-progress/ios-demo-mode-279/implementation-progress.md` (the findings while porting, in more detail than here).

## Current Implementation Summary

The demo is the real phone build (the same `/mobile` code) running against a **demo node inside the page**. It is compiled only into a separate build (`build:mobile-web --demo` → `dist-mobile-demo/public`) that the iOS app bundles as `DemoWeb/`. It opens in a web view with no network. The iOS shell gains Android's start screen and connect flow, the shell bridge, the demo web view, the `autobyteus://demo` route, the scanner's demo code and the share handling. The phone shell gains the demo identity, the iPad layout, DC-007, DC-011 and local icons in every build.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/ios-demo-mode-279/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002` (Pass; ARCH-REV-001's AR-001…003 and R-1…R-3 resolved by SR-002)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Commits (oldest first), all on `codex/ios-demo-mode-279` after `8430d9ef12`:

| Commit | What |
| --- | --- |
| `12e85dcc05` | R-002 premise check of the demo web view (iPhone and iPad simulators) |
| `52a3ed782c` | Demo build skeleton: boot, transport, the demo node's dispatch |
| `36d62c8338` | The demo world and the run list's answers |
| `19c47b4561` | Conversations, run trees, agent stream, scripted runtime |
| `46dc221490` | Agent stream wire format, collaboration view, node desktop |
| `4d9069db4f` | Team and Org streams, member replies, shared root views |
| `4c56baf15c` | Every node answer the phone asks for (full GraphQL table, REST content, file-explorer stream) |
| `072fb7c744` | Attachments; `XMLHttpRequest` at the network boundary |
| `4f211875fd` | Node desktop: a minimal RFB 3.8 server |
| `c76c1262bb` | Local icons in every build; the Iconify API is off |
| `c4ef51e751` | Contract, inventory and build checks; the `@` menu |
| `f4b9199052` | The demo identity on the phone; sweep probes |
| `b9a784779b` | iPad layout; the demo picture's URL |
| `2490b48c28` | DC-007 own send follows; DC-011 phone artifacts read only |
| `e116e1d9ac` | iOS: Android's start screen and connect flow; the built-in demo |
| `5f2c57c0f2` | iOS: native sheets as centered 512 pt cards on iPad; iPad landscape UI test |
| `1e72592586` | The iOS release workflow builds the bundled demo from a fresh install |
| `e36f18cfd3` | Activity on every sample run (the probes' finding); probes follow the iPad two panes |
| `c572234f0f` | The local icon bundle's JSON import typed for the typecheck gate |
| `df18856ea4` | The iPad landscape test is its own class, left out of the iPhone smoke |
| (next) | This handoff, the revision record, follow-ups and the evidence |

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk.
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the implementation is the design's scope: a new web subsystem (`autobyteus-web/demo/`, about 60 files), a separate build, the iOS start screen port, the shell bridge, a bundled web-content boundary, the iPad layout of the real phone shell, DC-007/DC-011, local icons and a release workflow change. No node protocol change was needed; the escalation trigger did not fire (the XHR coverage below sits inside the named transport adapter).
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Deviations recorded under Important Assumptions; none changes an owner or a boundary.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / REQ-002 | Try demo, the demo code, `autobyteus://demo` open the demo run list | `StartViewController` (Try demo) / `QRCodeScannerViewController.found(_:)` ("Demo code found", 0.7 s) / `SceneDelegate` → `AppShellCoordinator.handleIncomingURL` → `openDemo()` → `Demo/DemoWebViewController` (`DemoSchemeHandler` at `autobyteus-demo://app/`) → `demo/plugins/00.demoBoot.client.ts` → `demo/demoBoot.ts` (transport, world, session via `mobileCredentialStorage`) → plugin 21 binds → run list | Done. UI tests `testTryDemo…`, `testScanningTheDemoCode…`, `testTheDemoLinkOpensTheDemo` (iPhone and iPad) |
| DS-002 / REQ-003 | Every phone request answered by the demo node; nothing leaves | `demo/demoTransport.ts` (`fetch`, `WebSocket`) + `demo/demoXmlHttpRequest.ts` (XHR) → `demo/DemoNode.ts` → `demo/graphql/*`, `demo/rest/*`, `demo/streams/*` → `demo/world/*`. iOS second guard: the content rule list in `DemoWebViewController` (two rules, `http(s)` and `ws(s)`) | Done. 45 operations handled (typed `DemoGraphqlHandlers`), 207 compiled ones listed unreachable with reasons; `testTheDemoWebViewBlocksTheNetwork`; the probes record any external request |
| DS-003 / REQ-005 | Scripted turn: ack, Running, a tool call, 3-word steps of 70 ms, the exact closing line, Idle; Stop; member reply; New run; attachment named; Settings Save; VNC View/Control | `demo/runtime.ts`, `demo/world/*` (`DemoWorld.startAgentRun`, `terminate`, `start` with the in-band `run_lifecycle` switch), `world/contextFiles.ts` + `rest/contextFiles.ts`, `demo/streams/rfbServer.ts` | Done. Sweep probes (crawl, sheets, upload, final) |
| REQ-004 | Sample world coverage | `demo/world/content/*` (ported from the design reference), `world/rootViews.ts`, `world/folder.ts`, `world/participantMessages.ts`, `world/content/models.ts` (three runtimes, sample models) | Done |
| DS-004 / REQ-006 | Demo identity; Leave demo; cold launch to the first screen; never saved | `MobileRunList.vue` (`demo` prop: "Demo / Sample data" sparkles button, the welcome card, closed per entry via sessionStorage), `MobileConnectionSheet.vue` (demo sheet, Leave demo), `MobilePairedShell.vue` (`isDemoSession`, `leaveDemo()` → `shellBridge.leaveDemo()`), iOS `ShellBridgeHandler` `.leaveDemo` → coordinator `showStart()`; non-persistent `WKWebsiteDataStore` per open | Done. `testTryDemoThenLeaveDemoThenColdLaunch` |
| DS-005 / REQ-007 | Share: four messages; the app acts once | `AutoByteusMobileShareExtension/ShareViewController.swift`, `AutoByteusMobileCore/SharedText.swift` (`SharedTextAction`, `DemoLink`), `AppShellCoordinator.consumePendingShare()` (deferred one main-queue turn so the appearing screen is replaced cleanly) | Done. Core tests; `testAKeptShareIsUsedOnce` (via the Debug hook that keeps text as the extension does). The extension's own UI is not driven by an XCUITest (see Not run) |
| DS-006 / REQ-008 | iPad: < 768 phone; 768–1023 centered 448 first screen and 512 cards; ≥ 1024 two panes | Web: `composables/mobile/useMobileSplitLayout.ts` (viewport width only), `MobilePairedShell.vue` (380 px list; right pane as containing block via `transform: translateZ(0)`; "Choose a run"), `MobileBottomSheet.vue` (`md:` card), `MobileRunScreen.vue` / `MobileRunTargetView.vue` (`split`: no ←). iOS: `ShellUI.centeredColumn` (448 pt), `ShellUI.presentAsSheet` (512 pt form sheet on iPad) | Done. `testIPadLandscape`; web specs; probes at 820×1180 and 1180×820 |
| REQ-001 / REQ-013 | Android's start screen and connect flow; saved computers keep working | `AutoByteusMobileCore/NodeConnectionFlow.swift`, `ConnectionInputResolver.swift`, `CantReachReason.swift`; `Start/*`, `Connect/*`, `Shell/ShellStyle.swift`; `SavedNodeStore` read as before (`Directly Usable — No Migration`) | Done. Core tests; fake-node smoke and `AutoByteusMobileUITests` rewritten for the new connect path |
| REQ-009 (DC-007) | Your own send moves to your message and follows the reply | `composables/workspace/useOwnSendFollow.ts`, `AgentConversationFeed.vue` (`followLatest` shared with Jump to latest) | Done. Specs |
| REQ-010 (DC-011) | Phone Artifacts read only | `ArtifactContentViewer.vue` (`previewOnly`), `MobileArtifacts.vue` | Done. Specs |
| REQ-011 | Every icon bundled; no third-party request | `scripts/build-icon-bundle.mjs`, `plugins/01.localIcons.client.ts`, `assets/icons/phone-icon-bundle.json` (164 icons, five collections) | Done. `icons:check`, `buildIconBundle.spec.ts` |
| Build boundary | `/mobile` has no demo code; the demo build answers every compiled operation | `scripts/build-mobile-web.mjs`, `scripts/mobile-build-checks.mjs`, `demo/graphql/unreachable-operations.json`; `nuxt.config.ts` registers the demo plugin only with `AUTOBYTEUS_DEMO_BUILD=1` | Done. Both builds check their own output |
| iOS build | The app bundles DemoWeb; the release workflow builds it | `project.yml` (DemoWeb as a folder, pre-build check), `scripts/prepare-demo-web.sh [--build]`, `.github/workflows/release-ios.yml` (both macOS jobs) | Done locally (IMP-06). The build-only workflow run is not run (see Not run) |
| REQ-012 / REQ-014 | Device checks and Apple submission on the founder's word | — | Not started by design: nothing went to Apple, TestFlight or App Store Connect |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. The node (server) and Android are untouched; the desktop changes only through the shared conversation feed (DC-007) and the shared local icon registration.

## Key Files Or Areas

- `autobyteus-web/demo/` — the demo node (compiled only into the demo build): `demoBoot.ts`, `demoTransport.ts`, `demoXmlHttpRequest.ts`, `DemoNode.ts`, `graphql/`, `rest/`, `streams/` (incl. `rfbServer.ts`), `world/`, `runtime.ts`, `__tests__/`.
- `autobyteus-web/utils/remoteAccess/demoSession.ts`, `shellBridge.ts` — the demo fact and `leaveDemo` in every build.
- `autobyteus-web/components/mobile/…` — `MobileRunList.vue`, `connection/MobileConnectionSheet.vue`, `MobilePairedShell.vue`, `MobileBottomSheet.vue`, `MobileRunScreen.vue`, `MobileRunTargetView.vue`, `views/MobileArtifacts.vue`; `composables/mobile/useMobileSplitLayout.ts`.
- `autobyteus-web/components/workspace/agent/AgentConversationFeed.vue`, `ArtifactContentViewer.vue`; `composables/workspace/useOwnSendFollow.ts`.
- `autobyteus-web/scripts/{build-mobile-web,mobile-build-checks,build-icon-bundle}.mjs`, `plugins/01.localIcons.client.ts`, `assets/icons/phone-icon-bundle.json`, `nuxt.config.ts`.
- `autobyteus-web/tests/e2e/mobile-demo-*.mjs`, `tests/e2e/fixtures/demo-build-server.mjs`.
- `autobyteus-ios/AutoByteusMobileCore/{NodeConnectionFlow,ConnectionInputResolver,CantReachReason,SharedText}.swift` + tests.
- `autobyteus-ios/AutoByteusMobile/{AppShellCoordinator,SceneDelegate,QRCodeScannerViewController,WebShellViewController,AutoByteusWebViewController}.swift`, `Start/`, `Connect/`, `Shell/`, `Demo/`; `AutoByteusMobileShareExtension/ShareViewController.swift`; `AutoByteusMobileUITests/`.
- `autobyteus-ios/project.yml`, `autobyteus-ios/scripts/prepare-demo-web.sh`, `.github/workflows/release-ios.yml`.

## Important Assumptions

Decisions taken during implementation, none changing an owner or boundary (details in `implementation-progress.md`):

1. **The transport also covers `XMLHttpRequest`.** The phone's axios REST client (uploads) uses XHR, which the design's transport sentence does not name. The transport is the page's one network boundary, so `demoXmlHttpRequest.ts` applies the same rule (demo origin → demo node; page origin, `blob:`, `data:` native; else offline). Installed by `installDemoTransport`.
2. **Icons: five collections, not four.** The desktop shell names `ph:brain` and `ph:tree-view`; with the Iconify API off in every build, the bundle holds every name in the source, so `ph` is included.
3. **The compiled-operation oracle found two reachable operations** beyond the inventory (`GetCollaboratorMentionCandidates`, `GetTeamRunExecutionCheckpoint`); both are answered. The other 207 are listed with reasons. One measured-plus-found REST route: `GET /rest/workspaces/:id/content` (Files' pictures).
4. **One invocation, one id.** Activity is derived from the conversation's tool calls with the same ids, because member views reconcile the two by id.
5. **A run's views switch mode in band** (`run_lifecycle`) when it starts on a send or stops, as the node's `connectToActiveRun` does.
6. **The demo picture's URL** is absolute at the demo origin (`SHOWCASE_IMAGE_URL`), because the page's own origin is the app's. Sample pictures are SVG strings in the world content rather than files under `demo/world/files/`.
7. **Row naming** follows the node's rule (`rowNameOf`), not the reference's Title Case / snake case; VIS-020's closing line follows the copy table, not the screenshot's older variant. Both for the sweep to see.
8. **First screen copy** is Android's "…and press Show QR code" (DEC-024), not VIS-001's "choose Connect a phone".
9. **The demo sheet lives in `MobileConnectionSheet.vue`**, as the design's file table says; `MobileRunScreen` / `MobileRunTargetView` gain `split` for the iPad (no ←).
10. **The iPad right pane** is the containing block of its fixed-position screens (a transform), so screens need no per-screen change.
11. **The content rule list** uses two rules: WebKit rejects alternation ("Disjunctions are not supported yet"). A list that does not compile opens no demo (`assertionFailure` and back to the first screen). The R-002 summary was corrected.
12. **Native iPad sheets** (Type an address, a node's remove sheet) are 512 pt form sheets, centered by UIKit, not 24 pt above the bottom edge as the web card.
13. **`AgentConversationFeed.spec.ts`** asserted Iconify's loading placeholder (16×16); with local icons the real glyph draws. The test now checks the layout classes and the real view box.
14. **A stopped run keeps its Activity.** The ported content gave stopped runs none, and members without their own work had no tool call; the probes flagged five empty Activity views. A real node keeps a stopped run's Activity in its history, and REQ-004 asks for Activity on every run, so each sample agent now has some (`demoWorld.spec.ts` checks it).
15. **`DemoIPadUITests`** is its own class run against an iPad destination; the iPhone smoke (`ios-simulator-smoke.sh`, which fails on any skipped test) passes `-skip-testing` for it.

## Known Risks

- **The build-only run of `release-ios.yml`** has not run; the workflow change is checked locally (`prepare-demo-web.sh --build` from the worktree, the release contract check, YAML parse), not on a fresh runner.
- **R-004 app size:** DemoWeb is 13 MB.
- **Protocol drift (R-001):** a new phone operation without a handler fails the demo build's coverage check and the type check of `DemoGraphqlHandlers`.
- **XCUITest landscape screenshots** come out rotated (the XCUITest capture); the content was checked.
- **Apple's "prior approval" for demo modes (R-003)** is the founder's reply; nothing was sent.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`
- Reviewed root-cause classification: `No Design Issue Found` (new capability)
- Reviewed refactor decision: `No Refactor Needed` (beyond replacing the iOS first screen)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: per-subject GraphQL files with one typed dispatch table; contracts and generated types reused (no hand-written protocol copy); `demoTransport` adapts a real boundary; the world is the one owner of demo state.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. `ConnectionViewController.swift` and its notice card removed; the share extension's old message replaced; the remote Iconify fetch path replaced by local registration (the API module fetches nothing).
- Dead code in the touched files and modules removed: `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: FU-002 (three GraphQL documents no code imports). FU-001 is the design's own follow-up, now listed there; FU-003 is a timing flake in an untouched Electron test (IMP-01).
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Deviations from a design principle: `None`. Debug-only test hooks in the iOS app (`AUTOBYTEUS_UI_TEST_SCANNED_CODE`, `AUTOBYTEUS_UI_TEST_SHARED_TEXT`, `AUTOBYTEUS_UI_TEST_NETWORK_PROBE`) are `#if DEBUG`, as the existing `AUTOBYTEUS_CONNECTION_TIMEOUT_SECONDS` hook; reviewers may weigh them against DESIGN.md rule 11.
- Changed source files within size guardrails: `Yes`. Largest: `AgentConversationFeed.vue` 499 non-empty lines (500 before); every other changed source file ≤ 309.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (saved computers); the demo persists nothing.
- Design-spec decision reference: `design-spec.md` § Persisted Data.
- Implementation follows the approved decision: `Yes`. The start screen reads `SavedNodeStore` as before (the autobyteus-290 key migration runs unchanged); the share handoff uses the existing app-group key, consumed once; the demo uses a new non-persistent `WKWebsiteDataStore` per open and a fresh world.
- Direct-use evidence: the fake-node smoke saves and reopens a node through the new flow (IMP-11).
- Migration implementation: N/A.
- Deviation: `None`.

## Environment Or Dependency Notes

- New dev dependencies in `autobyteus-web`: `@iconify-json/{heroicons,mdi,ph,svg-spinners,vscode-icons}`, `@iconify/utils` (lockfile updated).
- `autobyteus-ios/DemoWeb/` is generated (`.gitignore`); run `autobyteus-ios/scripts/prepare-demo-web.sh --build` before building the app. The Xcode build fails without it.
- iOS checks ran on my own simulators: iPhone 17 Pro Max and iPad Air 11-inch (M3), iOS 26.1, Xcode 26.
- The untracked `autobyteus-application-*/dist/` folders in the worktree are local build output, not part of the change.

## Checks Run

Evidence folder: `tickets/in-progress/ios-demo-mode-279/evidence/implementation/`. Every web check below ran on `c572234f0f` or on a tree whose runtime code equals it: `c572234f0f` only adds a type cast in `plugins/01.localIcons.client.ts`, and the compiled JavaScript is unchanged.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run`; `pnpm exec vitest run --config ./electron/vitest.config.ts` | `c572234f0f` | macOS 26.5.2, Node 22.23.1, pnpm 10.28.2 | the whole web app incl. `demo/__tests__`, `scripts/__tests__`, the phone shell and DC-007/DC-011 specs | REQ-003…011, AC-008 | Pass | `IMP-01-web-unit-full.log` | `Test Files  784 passed (784)`, `Tests  5884 passed \| 2 skipped`. Electron: one timing flake in an untouched test (FU-003), then `Tests  11 passed (11)` ×3 alone and `Test Files  67 passed \| 1 skipped (68)` in a full rerun |
| IMP-02 | `pnpm -C autobyteus-web typecheck` | `c572234f0f` | as IMP-01 | every typed answer of the demo node (`DemoGraphqlHandlers` against `generated/graphql.ts`), the app | R-001, QR-003 | Pass | `IMP-02-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-03 | `pnpm -C autobyteus-web codegen:check` | `c572234f0f` | as IMP-01 | `generated/graphql.ts` against the built server's schema | R-001 | Pass | `IMP-03-codegen-check.log` | `autobyteus-web/generated/graphql.ts is current.` |
| IMP-04 | `pnpm -C autobyteus-web icons:check` | `1e72592586` (icon source unchanged since) | as IMP-01 | `assets/icons/phone-icon-bundle.json` against every icon name in the source and mapping tables | REQ-011, AR-003 | Pass | `IMP-04-icons-check.log` | `[icons] the bundle is current.` |
| IMP-05 | `pnpm -C autobyteus-web build:mobile-web` | `c572234f0f` | as IMP-01 | the node's `/mobile` build and its check `findDemoCode` | Build boundary (Dependency Rules) | Pass | `IMP-05-mobile-web-build.log` | `The /mobile build holds no demo code.` |
| IMP-06 | `autobyteus-ios/scripts/prepare-demo-web.sh --build` (the release workflow's new step: the web's workspace packages, then `build:mobile-web --demo`, then the copy to `DemoWeb/`) | `e36f18cfd3` tree | as IMP-01 | the demo build and its compiled-operation check; the prepare script | R-2, DS-002, Change Sequence step 4 | Pass | `IMP-06-prepare-demo-web-build.log` | `Scope: 4 of 13 workspace projects`; `The demo answers all 252 compiled operations (handled or listed as unreachable).`; `Demo web content copied to … ( 13M).` |
| IMP-07 | `node tests/e2e/mobile-demo-{crawl,sheets,upload,final}-probe.mjs --output-dir=…` against IMP-06's `dist-mobile-demo/public` | `e36f18cfd3` tree | headless Google Chrome; 440×956, 820×1180, 1180×820 | the whole demo as built: every run row (26 unfolded) and each ⋮ view, files, sheets, upload, Settings Stop/Save, Leave demo, a new demo | AC-003, AC-004, AC-007; REQ-004, 005, 006, 008 | Pass | `IMP-07-demo-probe-{crawl,sheets,upload,final}.log`, `IMP-07-demo-probes/` (each probe's JSON record and sample screenshots) | each size: `0 findings, 0 errors` (12 lines), `exit=0` ×4. An external request or console error counts as an error |
| IMP-08 | `xcodebuild … -scheme AutoByteusMobile -destination <iPhone 17 Pro Max> test` (the whole scheme; core part) | `c572234f0f` | my iPhone 17 Pro Max simulator, iOS 26.1, Xcode 26 | `AutoByteusMobileCore`: `NodeConnectionFlow`, `ConnectionInputResolver`, `CantReachReason`, `SharedText` and the existing core | REQ-001, 002, 007, 013; AC-001, AC-006 | Pass | `IMP-08-09-ios-iphone-tests.log` | `Executed 42 tests, with 0 failures` |
| IMP-09 | the same run (UI part) | `c572234f0f` | as IMP-08, with IMP-06's DemoWeb | `DemoUITests` on iPhone: first screen, Try demo → Leave demo → a new demo → cold launch, the demo code, the demo link, a kept share (demo link, other text), no network from the demo web view | AC-001, 002, 003 (simulator half), 005, 006 | Pass | `IMP-08-09-ios-iphone-tests.log` | six `DemoUITests … passed`. In this run the iPad test still skipped (before `df18856ea4`) and the fake-node tests skip without the smoke environment; IMP-11 runs them |
| IMP-10 | `xcodebuild … -destination <iPad Air 11-inch> -only-testing:AutoByteusMobileUITests/DemoUITests -only-testing:AutoByteusMobileUITests/DemoIPadUITests test` | `df18856ea4` tree | my iPad Air 11-inch (M3) simulator, iOS 26.1, IMP-06's DemoWeb | the same demo tests on iPad, plus `DemoIPadUITests.testIPadLandscape`: the 448 pt first screen, Type an address as a ≤ 512 pt card, the demo's two panes with "Choose a run" | AC-002, 005, 006, 007; REQ-008 | Pass | `IMP-10-ios-ui-ipad.log`, `IMP-10-ios-ui-ipad/*.png` (12 screenshots; landscape ones are stored rotated, as XCUITest captures them) | `Executed 7 tests, with 0 failures`; `DemoIPadUITests testIPadLandscape]' passed` |
| IMP-11 | `IOS_SIMULATOR_NAME=autobyteus-279-iphone autobyteus-ios/scripts/ios-simulator-smoke.sh <dir>` (the release workflow's smoke) | `df18856ea4` tree | my iPhone 17 Pro Max simulator; the script's local fake node | every UI test on iPhone, none skipped: the rewritten connect path against the fake node (save, reopen, Can't reach) and the six demo tests | REQ-001, REQ-013; AC-001 (fake node), AC-011 (iOS part) | Pass | `IMP-11-ios-simulator-smoke.log` | `Executed 8 tests, with 0 failures`; `Smoke UI tests: executed and passed without skips` |
| IMP-12 | `autobyteus-ios/scripts/ios-release-contract-check.py`; parse `release-ios.yml` and list each macOS job's steps | `df18856ea4` | macOS, Python 3, Ruby | the release contract and the workflow's new steps | Change Sequence step 4 | Pass | `IMP-12-ios-release-contract-and-workflow.log` | `iOS release contract checks passed.`; `Install workspace dependencies \| Build the bundled demo \| Generate…` in both `build-ios` and `upload-testflight` |

Earlier evidence kept from this round: `evidence/implementation/r002/summary.md` (the R-002 premise check at `12e85dcc05`, corrected about the content rule list).

- Not run, and why:
  - **The build-only run of `release-ios.yml`** (`publish_app_store_connect=false`) on the ticket branch: it needs the branch pushed (RELEASE.md § Build-only release run; DESIGN.md rule 12). Left to API/E2E or delivery; IMP-06 and IMP-12 cover what a Mac can.
  - **The Fresh-start build** (TESTING.md): a clean clone with `pnpm install --frozen-lockfile` alone; API/E2E's by RELEASE.md. IMP-06 ran the new prepare step in the worktree, where `dist/` folders already existed.
  - **The existing phone probe `test:e2e:mobile-shell`** (AC-011; real isolated nodes with scripted runtimes): API/E2E's executable coverage. The phone shell changed (iPad layout, DC-007, DC-011, local icons), so it should run.
  - **The share extension's own sheet driven from another app** (UIS-016's four messages on screen): the XCUITests cover the app's handling of the kept text, not the extension's UI.
  - **Rotation with a run open** (TR-012) in the iOS app: the web split keeps the open run (web specs and probes at both iPad sizes); the XCUITest rotates before opening the demo.
  - **Device checks and TestFlight** (AC-002 camera, AC-003 airplane mode, AC-009, AC-010): only on the founder's explicit word (REQ-014). Nothing went to Apple, TestFlight or App Store Connect.
  - **Android suites** (AC-011): Android is untouched by this ticket.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the iOS first screen, Type an address, Remove, Connecting, Can't reach, the scanner; the demo's run list, welcome card, demo sheet, a run's conversation and views (Artifacts, Files, Activity, Settings, Messages), New run, attachments, the `@` menu, VNC; the iPad portrait and landscape layouts; DC-007 and DC-011 in the real phone shell.
- Approved references: `ui-ux-spec.md` VIS-001…037; the design reference at `78b51f73`.
- Existing design system and adjacent surfaces reviewed: Android's start, connect and sheet screens (ported look and copy), the phone shell's sheets and run screens, Heroicons.
- Surfaces used: the Nuxt dev server in demo mode (`AUTOBYTEUS_MOBILE_WEB_BUILD=true AUTOBYTEUS_DEMO_BUILD=1`), the built `dist-mobile-demo/public` in headless Chrome at 440×956, 820×1180 and 1180×820 (the probes), and the built app on the iPhone and iPad simulators (XCUITests with screenshots).
- States inspected: first launch hero, Other ways open and closed, Type an address with prefill and the `http://` tick, the demo code found, the demo run list with and without the welcome card, the demo sheet, sending (streaming, tool call, closing line, Idle), Stop, a stopped Team starting on a send, New run, Settings Model sheet and Save, upload, VNC View only and Control, iPad split with the empty pane, sheets as cards.
- Issues found and corrected: duplicate tool cards in member views; "frame before its snapshot" warnings; unavailable references; Files' pictures; uploads bypassing the transport; the broken picture in the build; icons fetched from the network; the PTM row fold; the content rule list not compiling; native sheets full width on iPad; the start screen chevron hugging; empty Activity on stopped runs (IMP-07's first run).
- Check IDs: IMP-07 (probes), IMP-09/IMP-10 (XCUITests and screenshots in `evidence/implementation/IMP-10-ios-ui-ipad/`). Unverified: the real camera, the Camera app link on a device, airplane mode on a device, the share extension's own sheet in Messages/Safari (device and TestFlight, on the founder's word).

## Downstream Coverage Hints / Suggested Scenarios

- The probes `pnpm -C autobyteus-web test:e2e:mobile-demo` (after `build:mobile-web --demo`) are the sweep's durable form; `--sizes=` filters, `--output-dir=` keeps each run.
- The iPad landscape class: `xcodebuild … -only-testing:AutoByteusMobileUITests/DemoIPadUITests test` on an iPad simulator (the iPhone smoke leaves it out).
- The share extension driven from another app on the simulator (the four cases of UIS-016 / AC-006), which IMP-09/IMP-10 cover only through the kept-text hook.
- Rotation with an open run on iPad (TR-012, AC-007): the web split keeps the open run in the store; the XCUITest rotates before opening the demo.
- A real isolated node with scripted runtimes for AC-001 / AC-011: the existing `test:e2e:mobile-shell` probe (the phone shell changed: the iPad layout, DC-007, DC-011, local icons).
- The Fresh-start build (TESTING.md) for the build inputs this change touches (`autobyteus-web/package.json`, `pnpm-lock.yaml`, `nuxt.config.ts`, `scripts/**`, `.github/workflows/release-ios.yml`).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E: the executable coverage and validation above, including the Fresh-start build and the existing phone probe.
- The build-only run of `release-ios.yml` with `publish_app_store_connect=false` on the ticket branch (RELEASE.md, DESIGN.md rule 12) — it needs the branch pushed.
- The Solution Designer's App Reviewer sweep on the simulator build (Change Sequence step 5).
- On the founder's explicit word only: TestFlight and the device check (AC-002, AC-003, AC-009, AC-010).
