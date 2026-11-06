# API/E2E Execution Coverage Report — mobile-experience-redesign (autobyteus-277)

## Round

- Coverage investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- API/E2E revision record: [api-e2e-revision-record.md](api-e2e-revision-record.md), `API-REV-001`
- Test progress log: [api-e2e-test-progress.md](api-e2e-test-progress.md)
- Round and trigger: round 1, the code reviewer's CRR-002 Pass (Large/High). Code under test `f2816cc7c1` (HEAD `e7b3af5059`, then `bb80e60c97`, which changes only the implementation handoff).
- Prior round reviewed: none.
- Deviations from the plan:
  - MSP-13's trigger is a credential the node does not know (401). A device revoked on the node gets 403, which the phone's rule (unchanged from the base) does not cover; that path is recorded, not asserted (FU-003).
  - ADR-04's network log is a probe-owned counting proxy between the emulator and alpha; the node logs no requests at WARN.
  - ADR-05 was added while running ADR-02 (Android 15 status bar).
  - IOS-01 is unpaired: the simulator tooling here cannot tap "Pair". IOS-02 covers the paired screens in WebKit.
  - Device checks on the user's own phone are his (see Acceptance-Criteria Proof).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/evidence/api-e2e/` (committed with this report; the handoff gives the commit).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (after a later Pass; this round fails)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `f2816cc7c1` (code) | macOS, Node v22.23.1 | Two servers from this worktree's `autobyteus-server-ts/dist/app.js` (`pnpm -C autobyteus-server-ts build`, exit 0, `server-build.log`); the production phone bundle served by alpha at `/mobile` (`pnpm -C autobyteus-web build:mobile-web`, exit 0, `mobile-web-build.log`); `nuxt dev` for the desktop window; headless Chrome (playwright-core 1.58.2) | Phone 390×844 and 360×800, `isMobile`, touch; the phone pairs with `http://192.168.77.10:<alpha>` (a private HTTP origin: not a secure context, as a phone on a trusted LAN/tailnet HTTP URL), routed to alpha; scripted AGY and recorded Grok replay; test-owned temp data roots and HOMEs |
| ENV-2 | same | Android emulator, ticket-owned AVD `autobyteus277_api35` (Android 15, API 35, `sdk_gphone64_arm64`), Android System WebView 124.0.6367.219 | This worktree's debug APK (`./gradlew :app:assembleDebug`, `ADR-apk-build.log`, exit 0) | The held ENV-1 stack; the emulator reaches it at `http://10.0.2.2:<proxy>` through a counting proxy; DOM through the WebView's DevTools socket (raw CDP); taps and Back through adb |
| ENV-3 | same | macOS | Playwright WebKit 26.0 (build 2248, installed into a private `/tmp/autobyteus277-pw-browsers`), `iPhone 13` profile | The held ENV-1 stack, same routed private origin |
| ENV-4 | same | iOS 26.1 simulator (iPhone 17) | Mobile Safari | Alpha's `/mobile` at `http://127.0.0.1:<alpha>` |
| ENV-5 | `f2816cc7c1` + this round's probe edits | macOS | Existing probe stacks (fixture pages or probe-owned servers, `nuxt dev`, Chrome) | As each probe's header says |

## Cases

Evidence paths are relative to the evidence folder. `MSP-run-1/mobile-shell-probe.json` holds every MSP case's facts under `cases.<id>`.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | All (component), AC-010 | Web unit/component suite | Reused IMP-01 | — | Pass | (implementation handoff) | — | IMP-01 ran on `599002ecbf`; since then only phone files (IMP-06) and the removed `useTeamRunRuntimeCatalogSync` (IMP-05) changed |
| API-02 | AC-001, AC-008 | Phone specs | Reused IMP-06 | — | Pass | (handoff) | — | Ran on `f2816cc7c1` |
| API-03 | — | Team run store | Reused IMP-05 | — | Pass | (handoff) | — | Nothing it exercises changed after `b2d7a084dd` |
| API-04 | — | Typecheck, guards | `pnpm -C autobyteus-web typecheck`; `guard:web-boundary`; `guard:localization-boundary`; `audit:localization-literals` | ENV-5 | Pass | `API-04-typecheck-guards.txt` | `[typecheck] production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS`, `[guard:web-boundary] Passed.`, `[guard:localization-boundary] Passed.` | On the final tree with this round's probe edits |
| API-05 | REQ-006 (B08) | Fixture browser probe | `pnpm -C autobyteus-web test:e2e:fresh-run-auto-approval --output-dir …/API-05/fresh-run-auto-approval` | ENV-5 | Fail (out of scope) | `API-05/API-05-fresh-run-auto-approval.log`, `API-05/fresh-run-auto-approval/B04-failure.png`, `…/B08-agent-fresh.png` | B08 `"status": "Pass"`; B04 `Error: Members line reports one customized member`, screenshot "2 of 2 customized" | B08, the phone case this ticket changed, passes. B04 (desktop New chat) fails on a cause outside this ticket: seeded members count as customized (`runMemberTree.ts` `customization()`, since `035b208d53`); no file on that path changed here. FU-005 |
| MSP-01 | AC-001 | Real stack, phone + desktop window | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=…/MSP-run-1` | ENV-1 | Pass | `MSP-run-1/mobile-shell-probe.json` (`cases.MSP-01`), `MSP-01-phone-list-newest-5.png`, `MSP-01-phone-list-older-open.png`, `MSP-01-desktop-runs-view.png` | `phoneIds` equals `desktopIds` (7 runs: Agent, Team, Org, Grok); `"foldBefore": "Show older (2)"`, `"foldOpen": "Show fewer"`; ages on every top-level row | |
| MSP-02 | AC-002 | Real stack + desktop window | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-02 --output-dir=…/MSP-run-2-MSP-02` | ENV-1 | Fail | `MSP-run-2-MSP-02/mobile-shell-probe.json` (`cases.MSP-02.details`), `MSP-02-tree.png`, `MSP-02-desktop-tree.png` | Pass parts: PTM unfolded; task agent and task team (folded, members reviewer/editor) at depth 1; remote rows with `beta-node`; Team folded, Org unfolded; `"liveStatuses": ["idle", "offline"]` with its root open, `"reloaded": false`. Fail parts: `"teamRows": [["Delivery Team", 0], ["lead", 1], ["mate", 1], ["changelog helper", 1]]` (the lead's delegated run beside the lead; the desktop screenshot shows the same); `"phoneTitles"` all null while `"desktopTitles"` shows e.g. `["RN", "release notes writer", "Write the release notes."]`. Recorded: `"unselected": {"seen": ["idle"], …, "afterRootOpened": "offline"}` | F-06, F-07, F-08. MSP-run-1's MSP-02 row used an earlier live-state check that a scripted agent's instant turn cannot show; it was replaced, and MSP-run-2 is authoritative |
| MSP-03 | AC-003 | Real stack | as MSP-01 | ENV-1 | Fail | `MSP-run-1/mobile-shell-probe.json` (`cases.MSP-03.details`), `MSP-03-*.png` | Team run (coordinator "lead · Idle · in Delivery Team"): message reached, scroll 120→120, its row marked. Task agent, task-team member, Org member: open, named, scroll kept, marked, but `"reached": false` with `TypeError: crypto.randomUUID is not a function`. Org run row: `"states": ["list", "opening:", "none:", "list"]`. `"control": {"insecureContext": {"isSecureContext": false, "randomUUID": "undefined"}, "reached": true, "shownOnPhone": true}` | F-01, F-02 |
| MSP-04 | AC-003 (approve) | Real stack, Grok replay | as MSP-01 | ENV-1 | Pass | `cases.MSP-04`, `MSP-04-approval-pending.png`, `MSP-04-approved.png` | `"answer": {"outcome": "selected", "optionId": "allow-once"}`, `"commandShown": true` | A standalone run (the guarded id path) |
| MSP-05 | AC-003 alternates | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-05` | `snapshots`: `opening` (buttons `["Back to runs"]`) then `open` "lead" only; Forward re-attaches; Org member entry: `listQuery` keeps `orgRunId`, `orgMarked: "true"`, Forward restores it; `afterReload` has no `screen=run`; the second tap wins | C-04 (a failed open showing an earlier target) was not seen: the only failing open (Org run row) had no earlier target shown in its snapshots |
| MSP-06 | AC-004 | Two servers | as MSP-01 | ENV-1 | Fail | `cases.MSP-06.details`, `MSP-06-remote-run.png`, `MSP-06-peer-down-list.png`, `MSP-06-peer-down-notice.png`, `MSP-06-after-retry.png` | Pass parts (earlier assertions held): chip, title and state after the delegating run is opened; bar chip; text-only composer (placeholder names `beta-node`, no Upload, `@` opens nothing); beta down: remote rows `error` + "Not reachable", the notice "beta-node isn't reachable … Retry" with no composer, the Team run still opens, the peer "Not reachable" in the sheet; beta back: Retry recovers. Fail: `"onBeta": false`, `crypto.randomUUID is not a function` | F-02. Remote rows show `offline` and no title until their delegating run is opened (278's on-demand read; the desktop works the same) |
| MSP-07 | AC-006 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-07`, `MSP-07-*.png` | `"freshAgent": "Project Task Manager"`; after the Org member and ←: `"orgMarked": "true"`, `"orgAgent": "Release Notes Writer"`; agents only; `"factCheckerReadiness": "Choose a model before creating the run."`; `"statesDuringFirst": ["open"]`; the new run tops the list with its permanent id and the message stored | A nonexistent folder path is accepted by the node (no error to show; a run there fails `ACTIVATION_FAILED ENOENT`): FU-004 |
| MSP-08 | AC-007 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-08`, `MSP-08-*.png` | Menu `Artifacts, Files, Messages, Activity`; one artifact shown directly with `NOTES-TEXT-4242`; Files tree, path line, no filters, no Attach, search finds `src/app.ts`; Messages "To mate … TEAM-NOTE … guide.md", the reference opens and ← closes it; Activity rows; a standalone agent: `["Artifacts", "Files", "Activity"]`, "No Artifacts yet …", "No activity yet"; remote: "The files this run wrote are on beta-node." | The reference screen's look is F-04 (MSP-11) |
| MSP-09 | AC-008 | Real stack | as MSP-01 | ENV-1 | Fail | `cases.MSP-09.details`, `MSP-09-connection-sheet.png`, `MSP-09-node-down.png`, `MSP-09-unpair-confirm.png` | Pass parts: `"dialogName": "AutoByteus Desktop"`, URL, "Connected", `"peers": ["beta-node 2 agents · 1 teams"]`; alpha down: sheet and bar "Not reachable", banner "Can’t reach AutoByteus Desktop. Check"; 17 rows stay; Check clears both. Fail: `"confirmOnTop": {"onTop": false, "hit": "mobile-unpair"}`; the screenshot shows only the sheet | F-03. Review residual C-06 not seen: 12 s after alpha came back, the bar already said "Connected" with no banner (`c06`) |
| MSP-10 | AC-009 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-10`, `MSP-10-unsupported-notice.png` | No Home, Switch work, tabs, Workspaces, Projects; row buttons only `mobile-run-open`, `mobile-run-toggle`; notice ends "The desktop workspace isn’t on the phone. Your runs are here.", above the list; `/mobile/workspace` → `/mobile/?unsupported=desktopWorkspace` with the notice | The notice keeps the base component's heading "Unsupported on phone" |
| MSP-11 | AC-005, QR-001 | Real stack, 390×844 and 360×800 | as MSP-01 | ENV-1 | Fail | `cases.MSP-11.details`, `MSP-11-<screen>-<size>.png` (13 screens × 2 sizes) | No horizontal scroll on any screen; Back walks `["files", "run", "list"]` and `["messages", "run", "list"]` at both sizes. Fail: `"file-open: docs 41×44"`, `"reference-open: BUTTON 28×28"` ×3 | F-04, F-05. The Files search field is the spec's 40px field (exempt). The shared composer's Upload/Send and the shared approval buttons are known and out of scope |
| MSP-12 | DS-001, R-001, R-002, QR-003 | Real stack, network log | as MSP-01 | ENV-1 | Pass | `cases.MSP-12` | Every read `"window": null`; on the list at 3.1 s, 8.1 s, 13.1 s; none on the run screen, a view or hidden; back on the list a read at 492 ms; shown again at 38 ms; `"bytesPerRead": {"min": 6178, "median": 6206, "max": 6608}`; `"firstRowsMs": 438` | Hidden is emulated in this browser (`visibilityState`); ADR-04 shows the real background |
| MSP-13 | E-27, AR-008 | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-13`, `MSP-13-unknown-credential-to-pairing.png`, `MSP-13-revoked-device.png` | One `ListWorkspaceRunHistory` `"status": 401`, then pairing, session removed. Recorded: revoked device `"revokedShows": {"pairing": false, "list": "error", "bar": "Connected"}`, reads 403 | Revoked (403) is outside the rule, as at the base: FU-003 |
| MSP-14 | AC-002 alternate | Real stack | as MSP-01 | ENV-1 | Pass | `cases.MSP-14`, `MSP-14-after-done.png` | `"gone": true, "reloaded": false` | Task A DONE through the PTM's `update_task` |
| UPD-NVP | AC-010, persisted session | Real stack | `pnpm -C autobyteus-web test:e2e:node-vocabulary --output-dir=…/UPD-NVP` | ENV-5 | Pass (NVP-04) | `UPD-NVP/node-vocabulary-probe.json`, `UPD-NVP/NVP-04-phone.png` | NVP-04 `"shown": "runs"`, `storedKeys` without `version` | NVP-05 (desktop Memory Sync, no phone step) failed: the dev server crashed on a proxied socket reset when the probe restarted its backend (`frontend.log:50` `[unhandledRejection] read ECONNRESET`, restart at `:72`). FU-006 |
| UPD-LRL-004 | Preserved Messages unavailable | Real stack | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases LRL-004,WVC-004 --output-dir …/UPD-LRL-WVC` | ENV-5 | Pass | `UPD-LRL-WVC/delegated-launch-defaults-evidence.json`, `UPD-LRL-WVC/LRL-004-phone-unavailable.png` | `LRL-004 Pass` | In this run WVC-004 failed on my recorder (it read `null` as "omitted"); fixed, rerun below |
| UPD-WVC-004 | DS-001 | Real stack | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases WVC-004 --output-dir …/UPD-WVC` | ENV-5 | Pass | `UPD-WVC/delegated-launch-defaults-evidence.json` | `"desktopReads": [null], "phoneReads": [null], "desktopReadsAfterPhone": [null]` | |
| UPD-OSR | REQ-007 Artifacts | Real stack | `pnpm -C autobyteus-web test:e2e:owner-scoped-file-reads --seed-to /tmp/autobyteus277-osr-seed --unrelated 30`, then `--from-seed … --output-dir …/UPD-OSR --cases B-006,B-007` | ENV-5 | Pass | `UPD-OSR-seed.log`, `UPD-OSR.log`, `UPD-OSR/` | `"B-006":"Pass","B-007":"Pass"` | 30 unrelated runs instead of 600: the journeys do not depend on the count |
| DSK-01 | AC-010 | Desktop, two servers | `pnpm -C autobyteus-web test:e2e:remote-runs-in-tree --output-dir=…/DSK-01` | ENV-5 | Pass | `DSK-01.log`, `DSK-01/` | `remote-runs-in-tree probe: Pass` | Shared open actions, collaboration rows, Org opening, Stop |
| DSK-02 | AC-010 | Desktop, fixtures | `node tests/e2e/<name>-probe.mjs --output-dir …/DSK-02/<name>` for agent-org-task-team-disclosure, task-agent-sibling-sidebar, standalone-agent-error-stop, team-activity-presentation | ENV-5 | Pass | `DSK-02/DSK-02-*.log` | "… browser probe passed." ×4 | |
| DSK-03 | AC-010 | Desktop, real stack | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir …/DSK-03 --cases BR-001` | ENV-5 | Pass | `DSK-03.log`, `DSK-03/evidence.json` | `Task closure tree probe: Pass` | `AgentRunTaskRows` on the moved rules |
| ADR-01 | AC-010 (pairing), QR-003 (emulator), QR-004 | Android shell + WebView | `node scripts/android-journey.mjs <hold.json> <apk> …/ADR-run-1` | ENV-2 | Pass | `ADR-run-1/android-journey.json`, `ADR-01-2-pairing.png`, `ADR-01-3-run-list.png` | `"rows": 13, "firstRowsAfterPairMs": 523`, `"layout": {"width": 412, …, "horizontalScroll": false, "secure": false, "randomUUID": "undefined"}` | The link shared into the app, the HTTP acknowledgement, Save and open, Pair: a real pairing. The connection screen is not captured (it shows the pairing link) |
| ADR-02 | AC-005 (system Back) | Android | same | ENV-2 | Pass | `android-journey.json`, `ADR-02-1-file-open.png`, `ADR-02-2-back-to-list.png`, `ADR-02-3-reference-open.png` | `"filesWalk": ["files", "run", "list"], "referenceWalk": ["messages", "run", "list"]` | `KEYCODE_BACK` |
| ADR-03 | AC-010 (restart, notice, unpair) | Android | same | ENV-2 | Fail | `android-journey.json`, `ADR-03-1-after-restart.png`, `ADR-03-2-notice.png`, `ADR-03-3-unpair-tapped.png`, `ADR-03-4-after-unpair-tap.png` | `"afterRestart": "list"`, notice text; Fail: `"confirmOnTop": false, "afterUnpairTap": "list"` | F-03 on a device: a real tap on the confirmation's Unpair does nothing |
| ADR-04 | R-002, poll in background | Android | same | ENV-2 | Pass | `android-journey.json`, `ADR-04-back-in-front.png` | `"inFront15s": 3, "inBackground25s": 0, "readsAfterFront": [1727], "listed": true` | The run created while in the background is listed after the return (3.1 s including the CDP re-attach) |
| ADR-05 | AC-005, QR-001 (Android 15) | Android | same | ENV-2 | Fail | `android-journey.json`, `ADR-05-1-run-screen-under-status-bar.png`, `ADR-05-2-menu-after-lower-tap.png`, `ADR-01-3-run-list.png` | `"statusBarBottomPx": 74`, ⋮ `menuButtonDevicePx {"top": 10, "bottom": 136}`, `"underStatusBarCss": 25`, `"openedByCenterTap": 0`, `"openedByLowerTap": 1`; the clock draws over the node name | F-09. The Android shell (targetSdk 35, no inset handling, unchanged since May) runs edge-to-edge on Android 15 |
| IOS-01 | QR-004, AC-010 | iOS 26.1 Safari | `xcrun simctl openurl <iPhone 17> http://127.0.0.1:<alpha>/mobile?unsupported=desktopWorkspace` | ENV-4 | Pass | `IOS-run-1/IOS-01-safari-iphone17-mobile.png` | "Connect this phone" with the notice "The desktop workspace isn’t on the phone. Your runs are here." | Unpaired only (see Deviations) |
| IOS-02 | QR-004 | WebKit | `node scripts/ios-webkit-journey.mjs <hold.json> …/IOS-run-1 /tmp/autobyteus277-pw-browsers/webkit-2248/pw_run.sh` | ENV-3 | Pass | `IOS-run-1/ios-webkit-journey.json`, `IOS-02-*.png` | `"result": "Pass"`, `"context": {"secure": false, "randomUUID": "undefined", "dvh": true, "safeArea": true}`, `"messageShown": true`, no horizontal scroll on 8 screens, `"unknownErrors": []` | |

## Findings

| Finding | Criteria | What happens | Cause (evidence) | Preliminary classification, owner |
| --- | --- | --- | --- | --- |
| F-01 | AC-003, REQ-003, BEH-002 | Tapping an Org run's row shows "Opening…", then the list; it never opens the Org's first member. An Org member's row opens | The phone's Org `open` command commits without selecting a member; the shared resolver (`agentOrgContextsStore.activeTargetFor`) then has no target, and `MobileRunScreen` sends a run screen with no pending open and no target to the list (states `opening → none → list`). The desktop's Org view selects a member from the route itself (`AgentOrgWorkspaceView.vue:108-121`) | Local Fix, implementation |
| F-02 | AC-003, AC-004, REQ-003, REQ-004 | On a phone page served over plain HTTP (a trusted LAN/tailnet URL, which pairing supports; also the Android WebView in ADR-01), a message to a task agent, a task-team member, an Org member or a remote run is not sent: `TypeError: crypto.randomUUID is not a function`. Standalone runs and a Team coordinator send | `crypto.randomUUID` exists only in secure contexts. Bare calls at `stores/agentRunCollaborationStore.ts:317`, `stores/agentOrgContextsStore.ts:246`, `services/agentCollaboration/agentRunCollaborationStreamingService.ts:135`, `services/agentOrgExecution/agentOrgStreamingService.ts:237` (and `TeamStreamingService.ts:157` without a message id); `agentRunStore.ts:55` guards it. Control: the same send with `randomUUID` present reaches the node (MSP-03 `control`). The calls predate this ticket; this ticket makes these sends reachable from the phone | Local Fix, implementation (it blocks this ticket's AC-003/AC-004 in a supported setup; the code reviewer decides whether it counts as this ticket or a prerequisite) |
| F-03 | AC-008, AC-010 | "Unpair this phone" opens the confirmation behind the connection sheet; a tap on its Unpair hits the sheet; the phone stays paired | `MobileBottomSheet` teleports to `<body>` (z-50) and stays open; `MobileUnpairConfirm` renders in place (z-50) earlier in the DOM (`MobilePairedShell.vue`: `showConnection` stays true when `showUnpairConfirm` turns true) | Local Fix, implementation |
| F-04 | AC-005, AC-007, QR-001, VIS-011 | A Messages reference opens with the shared viewer's own header (name, full path, edit, preview, fullscreen; three 28×28 controls) under the 48px bar; VIS-011 has the bar and the file only | `MobileTeamReferenceViewer` embeds `CollaborationMessageReferenceViewer` with its header. The Files viewer (VIS-029) is right | Local Fix, implementation |
| F-05 | AC-005, QR-001 | The Files path part "docs" is 41×44 | The path buttons have no minimum width | Local Fix, implementation |
| F-06 | AC-002, REQ-002, spec "Run row" (the title or Task line), VIS-001/002 | Delegated rows have no title or Task line; the desktop Runs view shows each one's Task title ("Write the release notes.", "Spare work. Marker SPARE.") | Implementation assumption 8 ("Task summary lines are a Projects feature") departs from the spec's row and from the desktop | Local Fix, implementation (or Design Impact if the reviewer finds the design left it open) |
| F-07 | AC-002, REQ-002, VIS-002 | A member's delegated task agent shows beside the member (a Team lead's helper at the members' level; a task-team coordinator's helper beside the task team), not under the member | The shared row sources lift task-agent leaves to the parent's level by design (`stores/runHistoryTeamExecutionRows.ts:60-66`); the stored tree of a standalone run lists them at the host. The desktop Runs view shows the same (`MSP-02-desktop-tree.png`). The design's DEC-001 (one list builder) and VIS-002 disagree | Design Impact, Solution Designer (the user may choose desktop parity or VIS-002) |
| F-08 | AC-002, REQ-002 ("each row shows its live state") | Under a root that is not the open run, a delegated run's state stays as first loaded; a run stopped on the node still shows Idle for three polls, until its root is opened | Child states come from the root's stored view, read once (`ensureStoredView`), and from the live stream of the selected root only (`useAgentRunCollaborationSync`); the 5 s poll does not refresh them. The desktop uses the same owners | Design Impact, Solution Designer |
| F-09 | AC-005, QR-001, QR-004 (Android 15) | On Android 15 the page runs under the status bar: the clock covers the bar's text, and 25 of the 48 CSS px of ←, ⋮ and the node button are under it (a tap at their centre does nothing) | The Android shell targets SDK 35 with no inset handling (Android 15 enforces edge-to-edge); WebView 124 gives the page no top inset. The base shell had the same exposure; Android shell changes are outside this ticket | Requirement Gap — a prerequisite candidate, Solution Designer (depends on the user's Android version) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MSP-01, MSP-12, MSP-09 (node down), WVC-004 screenshot (empty), API-02 (loading, read error) | Proven | QR-003's 2 s on his phone over Tailscale with his history: measured 0.44 s (browser) and 0.52 s (emulator) after pairing on the probe stack (~6.2 KB per read); his network and history need his phone |
| AC-002 | Yes | MSP-02, MSP-14 | Not Proven (F-06, F-07, F-08) | — |
| AC-003 | Yes | MSP-03, MSP-04, MSP-05, MSP-07 | Not Proven (F-01, F-02) | — |
| AC-004 | Yes | MSP-06 | Not Proven (F-02) | — |
| AC-005 | Yes | MSP-11, ADR-02, ADR-05, IOS-02 | Not Proven (F-04, F-05, F-09) | His confirmation on his phone |
| AC-006 | Yes | MSP-07, API-05 (B08) | Proven | — (a wrong folder path: the node accepts it, FU-004) |
| AC-007 | Yes | MSP-08, UPD-OSR | Not Proven (F-04: VIS-011) | — |
| AC-008 | Yes | MSP-09 | Not Proven (F-03) | — |
| AC-009 | Yes | MSP-10, MSP-08, MSP-07 | Proven | — |
| AC-010 | Yes | ADR-01, ADR-03, MSP-10, UPD-NVP, IOS-01, IOS-02, DSK-01…03, API-01, WVC-004, evidence sweep | Not Proven (F-03: unpair on Android) | His Android device |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 60% | 50% | All cases | Six of ten ACs fail on F-01…F-09 | The fixes and a rerun |
| Changed-boundary execution directness | 60% | 95% | MSP-*, ADR-*, IOS-02 run the production bundle against real servers | — | — |
| Cross-boundary integration realism | 55% | 95% | Two real nodes, real streams, real Phone Access credentials, scripted runtimes | Scripted runtimes turn instantly | — |
| Environment, identity, fixture fidelity | 60% | 90% | Private HTTP origin as a real phone; Android shell pairing; WebKit and iOS Safari | The user's network, history and device | His phone |
| Failure, edge, lifecycle, recovery | 50% | 90% | Node down/back, peer down/Retry, 401, background, restart, Task DONE | Revoked device (FU-003) | — |
| User surface, browser, device | 50% | 60% | MSP-11, ADR-02/05, IOS-01/02 | F-03, F-04, F-05, F-09 | The fixes |
| Durable regression coverage | 70% | 90% | `mobile-shell-probe.mjs` (new), four probes updated | Device journeys are ticket scripts | — |

- Overall post-repository confidence: 58% (simple average).
- Overall final confidence: 81% (simple average); the result is decided by the failing criteria, not the average.
- Every critical acceptance criterion directly proven, apart from user-only parts: `No` (AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-010).
- Final categories below 90%: requirement proof (50%), user surface (60%).
- 95% target met: `No`.

## Broader Validation Decision

- Decision: `Required` (and executed).
- Modes: Browser against a probe-owned real two-node stack; Android emulator with this worktree's APK; WebKit and iOS Safari.
- Gap addressed: repository tests mock the open sequence, the route history, the poll, the remote relay, Phone Access credentials and every device; all of these failed or passed only in the realistic surfaces.

## Persisted-Data Transition Checks

- Approved decision: `Not Affected`.
- Existing data: a released-format paired session (NVP-04) and an Android shell saved node across an app restart (ADR-03 `afterRestart: "list"`).
- No migration, no version branch observed.

## Compatibility / Legacy Scope Check

- Upstream backward compatibility in scope: `No`.
- Compatibility-only behavior observed: `No` (no Home, tabs or Switch sheet remain; MSP-10).
- Durable coverage kept only for compatibility: `No`.

## Durable Coverage Changed In The Codebase

| Path | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Added | MSP-01…MSP-14 | Script `test:e2e:mobile-shell`; `--hold` keeps the stack for device checks |
| `autobyteus-web/package.json` | Updated | — | One script line |
| `autobyteus-web/tests/e2e/node-vocabulary-probe.mjs` | Updated | UPD-NVP | NVP-04 waits for the run list |
| `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs` | Updated | UPD-LRL-004 | Phone path: run list → Team run → ⋮ → Messages |
| `autobyteus-web/tests/e2e/workspace-views-chooser-cases.mjs` | Updated | UPD-WVC-004 | The phone reads `null` (DS-001); `null` recorded as `null`; waits for the run list |
| `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` | Updated | UPD-OSR | Phone path: run list → row → ⋮ → Artifacts |

- Test-code review is requested after a passing round; this round is a failure.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model runtimes | Scripted AGY CLI; recorded Grok ACP replay | No provider cost; real tools, Tasks, delegation, approvals | Turns are instant (live "running" states are brief) |
| The phone's network address | Playwright routes `192.168.77.10:<port>` to alpha; the emulator uses `10.0.2.2` through a counting proxy | The node refuses loopback pairing URLs | Not Tailscale |
| Page hidden (MSP-12) | `document.visibilityState` override | Headless Chrome keeps pages visible | ADR-04 shows the real background |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks (servers, data roots, `nuxt dev`, Chrome) | Yes | Each probe's `finally` | Receipts `{"frontendExited": true, "serversLeft": 0, "rootRemoved": true}` |
| Held stack for the devices | Yes | SIGINT | Same receipt |
| Emulator `autobyteus277_api35` | Yes | `adb emu kill`; AVD kept for the rerun | Not running |
| iPhone 17 simulator | Shared | `xcrun simctl shutdown` | Shut down |
| `/tmp/autobyteus277-pw-browsers` (WebKit 2248) | Yes | Kept for the rerun | — |
| OSR seed, dev runs, scratch scripts | Yes | Deleted | Done |
| `scripts/android-journey.mjs`, `scripts/ios-webkit-journey.mjs` | Yes | Kept with the evidence | — |
| `autobyteus-web/dist`, `dist-mobile`, the APK | Yes | Ignored build outputs, kept for the rerun | — |

## Preliminary Classification

- `Local Fix` (implementation): F-01, F-02, F-03, F-04, F-05, F-06.
- `Design Impact` (Solution Designer): F-07, F-08.
- `Requirement Gap`, prerequisite candidate (Solution Designer): F-09.
- Follow-ups recorded (outside this ticket): FU-002 (definitions feed to localhost:8000), FU-003 (revoked phone), FU-004 (any folder path accepted), FU-005 (probe B04 expectation), FU-006 (dev server crash on backend restart).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-002, AC-003, AC-004, AC-005, AC-007, AC-008, AC-010. User-only parts: QR-003 on his phone and network, AC-005's confirmation on his phone, his Android device.
- Preliminary classification: mixed; Local Fix (implementation) for F-01…F-06, Design Impact for F-07 and F-08, Requirement Gap (prerequisite candidate) for F-09.
- Next recipient: `/software_engineering_team/code_reviewer`, failure-origin review.
- Notes: proven and passing on real stacks: the list and its order, Task DONE, opening a Team run and an Org member, approvals, "Opening…" only, Back/Forward, a new run's first message, New run, the views, the connection sheet and the node-down states, absence, the poll and its pauses, the 401 rule, the system Back key on Android, pairing in the Android shell, WebKit and iOS Safari rendering, the desktop regression probes.
