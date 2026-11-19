# Implementation progress — ios-demo-mode-279 (autobyteus-279)

A running record of the build, kept in the ticket so the work stays traceable between rounds. The authority is the design spec (SR-002, with N-1…N-3 applied) and the requirements; this file only says where the build stands.

## Done

- **R-002 premise check: Pass** on the iPhone 17 Pro Max and iPad Air 11-inch (M3) simulators, iOS 26.1 (`evidence/implementation/r002/summary.md`, commit `12e85dcc05`).
  - **Constraint found:** the demo's `WebSocket` must be the class that defines `send`/`close` itself, because noVNC checks a socket's immediate prototype only.
  - **Note for the iPad layout:** on iPad the web view reports a desktop user agent, so the layout must follow the viewport width, never the user agent.

## Step 1: the web demo node (done)

Working on the dev server (`AUTOBYTEUS_MOBILE_WEB_BUILD=true AUTOBYTEUS_DEMO_BUILD=1 NUXT_APP_BASE_URL=/ nuxt dev`):

- the run list renders from the world, with statuses over `/ws/run-status`;
- the showcase conversation renders (VIS-007);
- a send plays the scripted turn (tool call, the streamed answer, the closing line, Idle) with no console error;
- the run tree unfolds as the node's (`GetRunTree`, the collaboration and Team streams); a Team member opens, and Stop on a running member leaves it Idle;
- an Org member opens (`GetAgentOrgRunInspection`, `/ws/agent-org`) and a send gets the member reply (VIS-020) with no console error;
- Artifacts, Files (folders, a file, a picture), Activity (VIS-015) and Settings open on the showcase run; a member's Messages (VIS-019) open a reference file;
- New run: the run is prepared, the first send plays VIS-024's reply, and the run heads the list;
- Settings on a stopped run (Codex): the Model sheet as VIS-021, Save kept in memory, reopening shows it; a send then starts the run;
- a send to a member of a stopped Team (Billing Team) starts the Team; Stop in Settings terminates it again; no console error;
- an attached file (`upload.mjs`'s steps) uploads, shows on the message and is named in the reply (VIS-025); the demo's limits are the spec's 25 MB for files and 200 MB for audio and video;
- VNC Viewer: View only and Control connect and show the reference's sample desktop (VIS-022, 1024×640).

Findings while porting:

- **One invocation, one id.** The reference gave a conversation's tool calls and its Activity separate ids; the phone's member views reconcile the two by id (`reconcileTeamMemberToolState`), so each call showed twice. Activity is now built from the conversation's tool calls (`asActivities`), the showcase's uses its calls' ids, and the PTM's `delegate_task` calls are one per run it delegated (its tree's six).
- **Row and header names (VIS-004, VIS-020).** The reference shows Title Case delegated rows ("Software Engineering Team") and snake-case Org members (`launch_lead`, `content_writer`); the demo names rows by the node's own rule (`rowNameOf`: "software engineering team", "launch lead"), which is what a real node shows. Recorded for the sweep, not changed in the demo.
- **Closing line.** The member reply ends with the copy table's one closing line (UI spec line 281); VIS-020's screenshot shows an older variant.
- **Inventory gap.** Files' pictures load from `GET /rest/workspaces/:id/content`, which the measured inventory does not list (it saw no picture opened in Files). The demo answers it; the inventory test lists it as a measured-plus-found route.
- **A stopped run's views switch mode.** On the node a session switches to live when its run starts (`connectToActiveRun`, the Team view's in-band snapshot) and back when it stops. The demo does the same (`run_lifecycle`), so the first send to a prepared or stopped run raises no "frame before its snapshot" warning.
- **The REST client sends through `XMLHttpRequest`.** The phone's axios client (`services/api.ts`: uploads, size limits) uses XHR, which the design's transport sentence ("`fetch` and `WebSocket`") does not name. The transport is the page's one network boundary (DS-002, "the demo cannot reach the network"), so it now covers XHR the same way (`demo/demoXmlHttpRequest.ts`, installed by `installDemoTransport`): demo origin to the demo node, page origin / `blob:` / `data:` native, anything else fails offline. No owner or boundary changes; recorded for the reviewer.
- **noVNC's clipboard read in Chrome.** In Control, noVNC reads the clipboard when its canvas gets focus if the browser reports clipboard permission as "prompt" (Chrome); headless Chrome refuses and noVNC logs "Clipboard read failed". A real node does the same in that browser. WebKit (the iOS app) does not answer the permission query, so noVNC never reads there. The Chrome probes grant clipboard permission in their browser context.
- **Icons were fetched from the network.** `@iconify/vue` captured the real `fetch` when it loaded, before the demo transport, so the demo's icons came from `api.iconify.design` (the iOS content rule list would have blocked them). The local bundle replaces that path in every build: the API module now fetches nothing and logs a missing name.
- **Icon collections: five, not four.** The desktop shell names two Phosphor icons (`ph:brain`, `ph:tree-view`). The Iconify API is off in every build, so the bundle holds every name in the source, as the design's rule says, and that includes `ph`.
- **The compiled operations found two the phone can send.** The demo build compiles 252 operations; the measured inventory has 43. Checking the rest found the composer's `@` menu (`GetCollaboratorMentionCandidates`) and a Team's checkpoint (`GetTeamRunExecutionCheckpoint`) reachable on the phone; both are now answered (the `@` menu lists the sample agents and Teams). The other 207 are listed with a reason each (desktop pages and Settings, file editing, peers, and the rest); three are dead documents (FU-002).
- **The showcase picture's URL.** The node names stored media by a relative URL (`/rest/files/<category>/<name>`), which a phone page resolves to the node because the node serves it. The demo page is the app's own (`autobyteus-demo://app`), so the relative URL reached the app's files (the build's `200.html`) and the picture broke. The demo world now gives its picture at its node's origin (`SHOWCASE_IMAGE_URL`); the transport rule (N-1) is unchanged.
- **iPad panes without per-screen changes.** The reference moved each screen with CSS on its test id. The shell instead makes the right pane the containing block of its fixed-position screens (a transform), so every screen, and the viewers inside them, fills the pane; the run screen alone needs to know (no ←), through `useMobileSplitLayout`.
- **A test that read Iconify's placeholder.** `AgentConversationFeed.spec.ts` (the jump arrow's exact signature) expected the glyph's classes `h-4 w-4` and a 16 × 16 view box: Iconify's loading placeholder, since the icon was never loaded in tests. With the local bundle the real `heroicons:arrow-down` draws (24 × 24, Iconify's own classes); the test now compares the glyph's layout classes and the real view box.
- **The content rule list never compiled.** `^(https?|wss?)://` is not accepted by WebKit ("Disjunctions are not supported yet"), so the R-002 harness ran without it (its summary corrected). The app uses two rules without alternation, refuses to open a demo whose list did not compile, and a UI test shows an image from a real site is blocked in the demo web view.
- **iOS first screen copy.** Android's ("…and press Show QR code", DEC-024: the desktop's button is "Show QR code") rather than VIS-001's "…and choose Connect a phone".
- **Activity on stopped runs.** The probes found five runs with an empty Activity view: the ported content gave stopped runs none. A stopped run now keeps its Activity, as the node's run history does (REQ-004).
- **Reference files.** The node stores a message's references as absolute paths and names each by `sha256(messageId \0 path)`; the demo's messages carry absolute paths in the demo folder and its route resolves the same ids.

| Part | State | Files |
| --- | --- | --- |
| Demo fact in every build | done | `utils/remoteAccess/demoSession.ts` (`DEMO_ENTRY_ID`) |
| Demo plugin registered only for `AUTOBYTEUS_DEMO_BUILD=1` | done | `nuxt.config.ts`, `demo/plugins/00.demoBoot.client.ts` |
| Boot (transport, then world, then session) and the transport | done | `demo/demoBoot.ts`, `demo/demoTransport.ts`, `demo/demoIdentity.ts` |
| Dispatch (loud on anything unknown) | done | `demo/DemoNode.ts` |
| World: runs as trees, definitions, conversations, Activity, background tasks, run trees | done | `demo/world/*` (content ported from the design reference) |
| GraphQL | done | all 43 operations; the table is the complete `DemoGraphqlHandlers`, so a missing one fails the type check (`graphql/*.ts`) |
| REST | done | health, status, node desktop, node files, workspace files, file-change content (three owners), message references (three roots), the showcase picture (`rest/content.ts`) |
| Streams | done | `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration` (root views shared with their queries: `world/rootViews.ts`), `/ws/run-status`, `/ws/file-explorer`, `/ws/node-desktop` (RFB 3.8, `streams/nodeDesktopStream.ts`), the package-definitions and projects feeds; each run view switches mode when its run starts or stops |
| Runtime | done | send, Stop, the member reply, New run, terminate (a run and its delegated runs), a stopped run starting on a send, Settings Save in memory, attachments kept in memory and named in the reply (`world/contextFiles.ts`, `rest/contextFiles.ts`) |
| `--demo` build target | done | `scripts/build-mobile-web.mjs`; the build is 12 MB (R-004) |
| Local icons | done | `plugins/01.localIcons.client.ts`, `scripts/build-icon-bundle.mjs` (`pnpm icons:build`, `icons:check`), `assets/icons/phone-icon-bundle.json` (161 icons, 77 KB), `scripts/__tests__/buildIconBundle.spec.ts`; dev dependencies `@iconify-json/{heroicons,mdi,ph,svg-spinners,vscode-icons}`, `@iconify/utils` |
| Contract, inventory and build guard tests | done | `demo/__tests__/{demoInventory,demoStreams,demoWorld}.spec.ts` (the measured inventory as `fixtures/`), `scripts/__tests__/{demoImportBoundary,mobileBuildChecks,buildIconBundle}.spec.ts`; each build checks its own output (`scripts/mobile-build-checks.mjs`, run by `build-mobile-web.mjs`): `/mobile` holds no demo code, the demo answers all 252 compiled operations (45 handled, 207 listed in `demo/graphql/unreachable-operations.json` with their reasons) |
| Sweep probes | done | `tests/e2e/mobile-demo-*.mjs`: 0 findings, 0 errors at three sizes (handoff IMP-07) |

## Step 2: the web shell (done)

| Part | State | Files |
| --- | --- | --- |
| Demo identity (UIS-003, UIS-004; VIS-004, VIS-006) | done | `MobileRunList.vue` (the "Demo / Sample data" button with the sparkles mark, the welcome card, closed for the rest of an entry), `MobileConnectionSheet.vue` (the demo sheet and Leave demo), `MobilePairedShell.vue` (reads `isDemoSession` once), `utils/remoteAccess/shellBridge.ts` (`leaveDemo`), `utils/remoteAccess/demoSession.ts` (the welcome key); specs for each |
| iPad layout (REQ-008; VIS-031, 033, 034, 035) | done | `MobilePairedShell.vue` (two panes from 1024 px: the 380 px list and a right pane that is the containing block of every other screen, so each fills it unchanged; "Choose a run"), `MobileBottomSheet.vue` (a centered 512 px card from 768 px), `composables/mobile/useMobileSplitLayout.ts` (the viewport width, never the user agent), `MobileRunTargetView.vue` / `MobileRunScreen.vue` (no ← beside the list); specs |
| DC-007 (REQ-009) | done | `composables/workspace/useOwnSendFollow.ts` (your own send follows; others' activity waits behind Jump to latest), wired in `AgentConversationFeed.vue`, which shares one `followLatest` with Jump to latest and a subject change, so the file stays within 500 lines (499); specs |
| DC-011 (REQ-010) | done | `ArtifactContentViewer.vue` (`previewOnly`: no Edit Mode / Preview switch), `MobileArtifacts.vue` (passes it); specs |
| Sweep probes | green at three sizes (IMP-07) | `tests/e2e/mobile-demo-{crawl,sheets,upload,final}-probe.mjs`, `mobile-demo-probe-support.mjs`; `pnpm test:e2e:mobile-demo` |

## Step 3: iOS (done)

| Part | State | Files |
| --- | --- | --- |
| Connect flow, as Android (REQ-001, REQ-013) | done | `AutoByteusMobileCore/NodeConnectionFlow.swift` (a pairing link is saved when the page pairs; a typed address when it answers; a saved node opens), `ConnectionInputResolver.swift` (pairing link / typed address), `CantReachReason.swift`; tests |
| Shared text and the demo link (REQ-002, REQ-007) | done | `AutoByteusMobileCore/SharedText.swift` (`DemoLink`, `SharedTextAction` with the share sheet's copy); tests |
| Start screen, sheets, Connecting, Can't reach (UIS-001; VIS-001/002) | done | `Start/{StartViewController,NodeRowView,TypeAddressSheet,RemoveNodeSheet}.swift`, `Connect/{ConnectingViewController,CantReachViewController}.swift`, `Shell/ShellStyle.swift`, the mark asset; `ConnectionViewController.swift` removed |
| Scanner (UIS-002; VIS-003) | done | `QRCodeScannerViewController.swift`: Android's look; the demo code says "Demo code found" and opens the demo after 0.7 s |
| Shell bridge (node pages and the demo) | done | `Shell/ShellBridgeHandler.swift` (`window.AutoByteusShell`, main frame of the open origin only, no credential), `Shell/ShellFileSaver.swift`, `Shell/DesktopFullScreen.swift`; `WebShellViewController.swift`, `AutoByteusWebViewController.swift` |
| Demo web view (DS-001, REQ-003, REQ-006) | done | `Demo/{DemoWebViewController,DemoSchemeHandler}.swift`: the bundled build at `autobyteus-demo://app/`, a new non-persistent store each open, a content rule list blocking `http(s)` and `ws(s)` (a list that does not compile opens no demo) |
| Routes (DS-001, DS-004, DS-005) | done | `AppShellCoordinator.swift`, `SceneDelegate.swift` |
| Share extension (UIS-016) | done | `AutoByteusMobileShareExtension/ShareViewController.swift` (the four messages; a centered card on iPad) |
| Bundling | done | `project.yml` (DemoWeb/ as a folder; the build fails without it), `scripts/prepare-demo-web.sh`, `.gitignore` |
| XCUITests | done on iPhone and iPad (IMP-09…IMP-11) | `AutoByteusMobileUITests/DemoUITests.swift` (first screen, Try demo, Leave demo, a new demo, cold launch, the demo code, the demo link, a kept share, no network from the demo web view); the fake-node smoke tests rewritten for the new connect path |

## Steps 4–5

- Step 4 done: both macOS jobs of `release-ios.yml` build the bundled demo from `pnpm install` (`prepare-demo-web.sh --build`; IMP-06, IMP-12). Its build-only run on the branch is downstream (it needs the branch pushed).
- Step 5 is downstream: the Solution Designer's sweep, then TestFlight only on the founder's word.

The handoff is `implementation-handoff.md` (IR-001).
