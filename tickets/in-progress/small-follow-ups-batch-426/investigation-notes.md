# Investigation Notes — small-follow-ups-batch-426

## Investigation Meta

- Package identifier: `small-follow-ups-batch-426`
- Request / ticket: Project Task `autobyteus-426` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager`; replaces autobyteus-409, 410, 411, 422, 423
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426`, `codex/small-follow-ups-batch-426`
- Resolved base remote / branch / revision: `origin/personal` at `6225a734a3` (fetched 2026-11-07)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md, Finalization Target)
- Bootstrap result: worktree and branch created from `origin/personal`; ticket folder `tickets/in-progress/small-follow-ups-batch-426/`
- Bootstrap blocker: None
- Current solution revision ID: `SR-008`
- Authorities read (requirements reading gate; 2026-11-07): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`
- Investigation status: Complete for requirements; architecture findings appended below (§ Architecture Investigation Findings)

## Initial Request And Clarifications

- Original request: the Task text (18 items in four groups, with leads), see `requirements-doc.md` § Problem. Full source rows: archived `follow-ups.md` of 277 (`tickets/done/mobile-experience-redesign`), 415 (`android-keep-page-on-rotation`), 403 (`websocket-origin-and-phone-route-guard`), 395 (`one-step-phone-pairing`); 407's FU-005/FU-006 are observations in `tickets/done/node-desktop-on-phone/api-e2e-execution-coverage-report.md:25` and `api-e2e-test-review-report.md:66` (that ticket has no `follow-ups.md`).
- Clarifications received: none needed.
- User-supplied facts and constraints (Task): order and group items sensibly; an item may be dropped with an explanation; no new Android permission without approval; no change to stored data; existing paired phones and saved nodes keep working; tests on isolated nodes; DESIGN.md and TESTING.md; overlap with autobyteus-416 resolved by the teams at merge; release only on the user's word; finalized on the base branch, in rounds if preferred.
- Initial ambiguity: items 15 and 16 need Product UI/UX text first; item 9 needs a new server read.

## Source Log

| Date | Type | Source | Why | Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-07 | Command | `git log --merges origin/personal` | merge order | 277 → 415 → 407 → 403 → 417 (html-preview-isolation) → 395 (+391) → 425. 395 rebuilt the Android connection screens after 415 | E-04 |
| 2026-11-07 | Code | `autobyteus-web/app.vue:46`, `services/agentPackages/agentPackageDefinitionChangeFeed.ts:56-70`, `services/nodeChangeFeed/nodeChangeFeed.ts`, `stores/windowNodeContextStore.ts:48,81-85`, `stores/mobileNodeSessionStore.ts:103-117` | item 1 | E-01 | |
| 2026-11-07 | Runtime (archived) | `tickets/done/mobile-experience-redesign/evidence/api-e2e/MSP-run-1/mobile-shell-probe.json`, `server-alpha.log` | item 1 | E-01 | |
| 2026-11-07 | Code | `utils/remoteAccess/remoteAccessAuthFailure.ts`, `components/mobile/MobilePairedShell.vue:100-115`, `utils/remoteAccess/mobileConnectionDiagnostics.ts`, `components/mobile/runList/MobileRunList.vue:26-45,134`, `components/mobile/MobilePairingBootstrap.vue:116-127`, server `remote-access/services/remote-access-auth-service.ts:41-73` | item 2 | E-02 | |
| 2026-11-07 | Code | `autobyteus-android/.../MainActivity.kt:59-89`, `AndroidManifest.xml:31`, `composables/mobile/useMobileNavigation.ts` | item 3 | E-03 | |
| 2026-11-07 | Code | `MainActivity.kt:223-285`, `ui/sheets/TypeAddressSheet.kt`, `ui/sheets/SheetFrame.kt`, `ui/start/StartScreen.kt:83-89`, `shell/QrScanCoordinator.kt` | item 4 | E-04 | |
| 2026-11-07 | Code | `components/mobile/views/MobileNodeDesktop.vue`, `composables/useVncSession.ts`, noVNC `core/rfb.js:168,271-272,507,2338-2341` (1.7.0-g7c36fab, from the main checkout's `node_modules`) | item 5 | E-05 | |
| 2026-11-07 | Code | server `node-desktop/node-desktop-viewers.ts:18-70`, `node-desktop/node-desktop-stream.ts:137-141`, `api/websocket/node-desktop.ts:52-95` | item 6 | E-06 | |
| 2026-11-07 | Code | `web/AutoByteusWebView.kt:100-160`, `web/TrustedNavigationPolicy.kt`, `web/ShellBridge.kt`, `components/fileExplorer/viewers/HtmlPreviewer.vue` (after 417), 395 `evidence/API-14-bridge-abuse.txt` | item 7 | E-07 | |
| 2026-11-07 | Code | server `workspaces/workspace-manager.ts:54-135`, `workspaces/workspace-path-utils.ts:11-18`, `api/graphql/types/workspace.ts:111-121`; web callers `stores/workspace.ts:175`, `stores/runHistoryLoadActions.ts:495`, `stores/workspaceMetadataActions.ts:154`, `composables/mobile/useMobileLaunchWorkspaces.ts:67` | item 8 | E-08 | |
| 2026-11-07 | Code | `components/workspace/history/AgentRunTaskRows.vue:58-64`, `stores/agentRunCollaborationStore.ts:32-45,277-279`, server `api/graphql/types/agent-run-collaboration.ts:43-52` | item 9 | E-09 | |
| 2026-11-07 | Code / Command | `tests/e2e/fresh-run-auto-approval-probe.mjs:406-425`, `utils/runSettings/runMemberTree.ts:107-146,199`, `git log -1 035b208d53` | item 10 | E-10 | |
| 2026-11-07 | Code / Runtime (archived) | `nuxt.config.ts:144-153`, `tests/e2e/node-vocabulary-probe.mjs:319-332`, 277 `evidence/api-e2e/UPD-NVP/frontend.log:44-72`, Vite 7.3.1 `dist/node/chunks/config.js:21925-21927` | item 11 | E-11 | |
| 2026-11-07 | Doc | `autobyteus-web/docs/agent_artifacts.md:177,199,226`, `docs/content_rendering.md:79` | item 12 | E-12 | |
| 2026-11-07 | Doc | `docs/design-cases.md` (Cases 1–16; Case 5 at :67) | item 13 | E-13 | |
| 2026-11-07 | Code | server tests `workspaces-graphql.e2e.test.ts:384`, `workspace-run-history-graphql.e2e.test.ts:442`, `runtime-capability-graphql.e2e.test.ts:56-63`, `agent-runtimes-graphql.e2e.test.ts:86-90,379-400`; `runtime-management/agent-runtimes/agent-runtime-status-service.ts:142-150,271-316,322-350` | item 14 | E-14 | |
| 2026-11-07 | Code | `stores/phoneAccessStore.ts:100-190`, `utils/phoneAccessRemoteNode.ts:4-11`, `localization/messages/en/settings.ts:306-380` | items 15, 16 | E-15, E-16 | |
| 2026-11-07 | Command | `grep -rnE "toLocale(Date|Time)?String\((undefined|\))|Intl\.(DateTimeFormat|NumberFormat)\((undefined|\))|toLocaleString\(\[\]"` in `autobyteus-web` | item 17 | E-17 | |
| 2026-11-07 | Code | server `server-addressing/server-address-candidate-service.ts:6-22,104-121`, `remote-access/services/ip-address-ranges.ts`, consumers `api/graphql/types/memory-sync.ts:80`, `remote-collaboration-settings.ts:121`; web `stores/memorySyncStore.ts:54` | item 18 | E-18 | |

## Evidence By Item

Each finding says how it was established: `Read` (code/doc read), `Archived-Run` (an earlier ticket's recorded run), `Reproduced`/`Measured` (run in this investigation).

- **E-01 (item 1) — Read + Archived-Run.** `app.vue` retains the package-definitions feed app-wide while the app is ready; on `/mobile` that is always (not embedded). The feed's URL comes from the window node binding. The binding defaults to `getBrowserServerBaseUrl()` (mobile build: `localhost:8000`) and is moved to the paired node only by `bindSession` (stored or new session). The feed rebinds on `bindingRevision`. The archived MSP-run-1 browser errors are in contexts `phone` and `phone-unpair` (before pairing, and on a page after unpairing); after pairing the node's log shows the feed reaching the paired node (`Remote Access WebSocket rejected /ws/agent-package-definitions … REMOTE_ACCESS_DEVICE_REVOKED` after revocation). So the feed retries `localhost:8000` exactly while the phone has no session, and keeps retrying a revoked credential against the node. `/ws/agent-package-definitions` is a phone WebSocket route (`remote-access-route-policy.ts` `PHONE_WEBSOCKET_ROUTES`), so a paired phone needs the feed. An unpaired page loads no definition lists.
- **E-02 (item 2) — Read + Archived-Run.** The node answers a revoked phone's reads `403 REMOTE_ACCESS_DEVICE_REVOKED` and, when Phone Access is off, `403 PHONE_ACCESS_DISABLED` (checked after revocation; the device record is kept, so the credential works again when Phone Access is turned back on). `isRemoteAccessAuthFailure` rejects the session only for 401 and the two auth codes; `MobilePairedShell.checkStatus` then sets `authorizedApiReachable` from the public status read, which succeeds, so the bar says "Connected" and the list "Couldn’t load your runs." (277 MSP-13). The product already has the sentence "`<node>` is reachable, but Phone access is off." (`MobilePairingBootstrap.vue:120`) and the offline banner "Can’t reach `<node>`." + Check (`MobileRunList.vue:26-30`). A rejected session lands on the pairing screen (`MobileRemoteAccessShell.vue:3-9`).
- **E-03 (item 3) — Read.** Since 415 the activity is not recreated on rotation (`configChanges`). After process death `onCreate` opens `flow.open(lastUsed)` = the saved node's `/mobile` start URL; there is no `onSaveInstanceState`. The phone's screen state lives in the `/mobile` URL query (`useMobileNavigation`: `screen`, `file`, `workspace`, `message`, `reference`, `full` and the Org keys), so the WebView's current URL names the open page. The page's credential lives in the WebView's origin storage, which survives process death.
- **E-04 (item 4) — Read.** 395 replaced the 415-era connection screen (address field + Scan QR on one screen). Today: Start screen (Scan, Type an address, Paste link); "Type an address" is a bottom sheet over a full-screen scrim (`SheetFrame.kt`) with no Scan control; the scrim closes the sheet. The scanner opens only from the Start screen, the can't-reach screen ("Scan again") or the page (`onStartScan`). A typed address therefore cannot be on screen when a scan starts, and a failed typed connect reopens the sheet with the typed text (`NodeConnectionFlow.kt:52`, `showTypeAddress(prefill)`). The reported path (type, Scan QR, Back) no longer exists.
- **E-05 (item 5) — Read + Archived-Run.** noVNC's async clipboard needs `navigator.permissions` (undefined in the Android WebView, 407 API-04 environment note), and `navigator.clipboard` is absent on `http://` (non-secure) origins, which LAN nodes use. noVNC still offers `rfb.clipboardPasteFrom(text)` (sends text to the remote clipboard) and dispatches a `clipboard` event with `detail.text` when it cannot write the local clipboard (`rfb.js:2338-2341`). The phone view has Keyboard / mode / full-screen controls in its bar (`MobileNodeDesktop.vue:12-49`). Whether `document.execCommand('copy')` writes the phone clipboard from the WebView on an `http://` origin is **not measured** (U-01).
- **E-06 (item 6) — Read + Archived-Run.** A refused stream closes with 4429 in `registerNodeDesktopWebsocket` (`admission.refused`) without a log line; an admitted stream logs `[node-desktop] stream ended mode=… viewer=… durationMs=… reason=…` (metadata only, no device or credential).
- **E-07 (item 7) — Read + Archived-Run.** `HtmlPreviewer.vue` (after 417) uses `sandbox="allow-scripts"` (opaque origin) and either a node `/rest/workspaces/<id>/static/…` URL (allowed by the WebView path allowlist) or a `blob:` URL of the page's own origin for content without a workspace file. `shouldOverrideUrlLoading(request)` is called for subframe navigations too; `TrustedNavigationPolicy.classify` blocks every non-http(s) scheme, so the `blob:` subframe is blocked and the page shows "Navigation blocked" (395 API-14 run 2). `ShellBridge` is registered for the entry's origin rule only and ignores subframe messages (`isMainFrame`), so an opaque-origin frame gets no `AutoByteusShell` object.
- **E-08 (item 8) — Read + Archived-Run.** `canonicalizeWorkspaceRootPath` resolves relative paths against the server's cwd; `WorkspaceManager.createWorkspace` registers any path and persists it in the workspace registry; nothing checks existence or kind. The same mutation is used by user path entry (phone "Open a folder by path", desktop path entry) **and** by history restore and metadata registration of paths already recorded (`runHistoryLoadActions.ts:495`, `workspaceMetadataActions.ts:154`), and `ensureWorkspaceByRootPath` (run activation) reaches `createWorkspace` for registered roots. A run in a missing folder fails at activation with `ENOENT … realpath` (277 MSP-07).
- **E-09 (item 9) — Read + Archived-Run.** `AgentRunTaskRows` reads a run's stored collaboration view once; only an open (stream-attached) run stays current. The full view is up to 1.2 MB (277 E-38). No server read returns child statuses alone. → round 2 (DEC-002).
- **E-10 (item 10) — Read + Archived-Run.** Since `035b208d53` (2026-10-12, "seed launch forms from member defaults … seeded rows are pinned"), a seeded row's model counts as its own customization. B04 asserts the members line contains "1"; it reads "2 of 2 customized" because both members are seeded. The rule is a deliberate product rule of that commit.
- **E-11 (item 11) — Read + Archived-Run.** The archived dev-server log shows `ERROR [unhandledRejection] read ECONNRESET` (stack only in Node internals) and then the Nuxt banner again; the probe's next `page.goto` aborted. The FU row's premise "the proxy entries have no error handler" is **contradicted**: Vite 7.3.1 attaches its own `proxy.on("error")` handler that logs "http proxy error" and answers 500. The rejection's origin is **not established** (U-02). What is established: the dev server comes back by itself, so a probe that waits for it to answer again before navigating does not abort.
- **E-12 (item 12) — Read.** Four stale mentions of `TeamCommunicationReferenceViewer` (removed in `f519a2093c`); the current desktop viewer is `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue`.
- **E-13 (item 13) — Read.** `docs/design-cases.md` holds Cases 1–16; Case 5 "Claims About The Code Taken On Trust" is where lesson (a) belongs; no case covers a refresh designed without measuring its payload.
- **E-14 (item 14) — Read.** (1) `workspace-removal-guard.ts:66` says "Stop active runs before removing this workspace."; (2) `run-history.ts:33` declares `lastActivityAt`; (3) `deepseek_harness` added in `d5566977b4`; (4) AR-14: after `updateAgentRuntime` succeeds, the service starts an automatic re-check (`void this.check(row)`); `check` sets `updateState` to `upToDate` as soon as the latest version resolves, but `row.checking` stays true until the sign-in read also ends. The test's "re-checked" wait passes on `UP_TO_DATE`, then sets the newer installed version and calls `checkAgentRuntimes`, whose `checkAll` skips a row that is still checking — so the new version is never read and the wait times out. The label bug: the template literal `${JSON.stringify(last)}` is evaluated when `until` is called, before `last` is assigned. Cause of (4) **Read, not reproduced** (no `node_modules` in this worktree); implementation reproduces it first (R-01).
- **E-15 (item 15) — Read.** `phoneAccessStore.load` reads `/remote-access/network` (new in 395); on an older node the 404 reaches `formatPhoneAccessRequestError`, which shows the raw message.
- **E-16 (item 16) — Read.** Not-ready status keys speak of "this computer" (`settings.ts:315-321`), also in a remote node's window (395 API-10 §5).
- **E-17 (item 17) — Read.** About 25 call sites format dates, times or numbers with the OS locale: inside translated sentences `SystemInstructionActivityItem.vue:77`, `SkillSourceRow.vue:95`, `WorkJournalTab.vue:48,69,87,98,103` (numbers); stand-alone `WorkJournalTab.vue:184`, `MemorySearchResults.vue:93`, `MobileMessages.vue:82`, `CollaborationMessagesPanel.vue:286`, `IntegrationDetail.vue:186`, `BackgroundTaskPanel.vue:137`, `MemorySyncCard.vue:327`, `MemoryHome.vue:225`, `CollaborationMemoryDetail.vue:140`, `AgentMemoryDetail.vue:70`, `ServerMigrationsManager.vue:132`, `AboutSettingsManager.vue:283`, `UiErrorPanel.vue:103`, `useMemoryIndexView.ts:17,31`, `RawTracesTab.vue:121`, `applicationLaunchProfile.ts:421`, `tokenUsageFormatting.ts:6,11,29,55`. The project pattern is `useLocalization().resolvedLocale` (`NodeConnectionDetails.vue:146`, `UpdateChecksCard.vue:109`).
- **E-18 (item 18) — Read.** `server-address-candidate-service.ts` has its own `isTailnetLikeIp` and `isLanIp`, and the kind expression is `isLanIp(a) ? "lan" : "lan"`, so public IPv4/IPv6 and link-local (169.254/16, fe80::/10) addresses are listed as "Private/LAN address". `remote-access/services/ip-address-ranges.ts` owns parse/private/link-local/Tailscale-range helpers for Phone Access. Consumers: Memory Sync lists candidates with kind and label (web `kind: string`); Remote Collaboration uses base URLs only, tried in order.

## Relevant Existing Behavior

See `requirements-doc.md` § Relevant Current And Desired Behavior (BEH-001…BEH-018 map 1:1 to the items).

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Established | Requirement Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| Archived run (277 MSP-run-1) | phone before pairing / after unpair | feed retries `ws://localhost:8000/ws/agent-package-definitions` | Archived-Run | REQ-001 | E-01 |
| Archived run (277 MSP-13) | revoked phone | 403 REVOKED, bar "Connected", list error | Archived-Run | REQ-002 | E-02 |
| Archived run (277 UPD-NVP) | backend restart under nuxt dev | unhandledRejection ECONNRESET, dev server restarts | Archived-Run | REQ-011 | E-11 |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: B04 (`node tests/e2e/fresh-run-auto-approval-probe.mjs`), AR-14 (`pnpm vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts -t AR-14`), the three other failing E2E tests of item 14 as listed in E-14, NVP-05 (`node tests/e2e/node-vocabulary-probe.mjs`) — each fails on the base today per the archived evidence.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `product-design-request.md` (this folder) | Solution Designer | Product UI/UX text request for items 15 (later dropped), 16 | round 1 | REQ-016 | Done | — |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (+ `visual-references/VIS-001…009`, `product-ticket.md`) | Product Team | Approved remote-node wording | round 1 | REQ-016 / AC-016 | Approved, closed (design `personal` = `0341b3af`) | The user's "approved", 2026-11-07 |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | `execCommand('copy')` in the Android WebView on an `http://` node | Copy (REQ-005) | Design gives a fallback that always works (selectable text); API/E2E measures on the emulator | Open (design handles both) |
| U-02 | Unknown | Origin of the dev server's ECONNRESET rejection | REQ-011 | Requirement is outcome-based (probe waits for the dev server); not needed to know the origin | Accepted |
| R-01 | Risk | AR-14 cause read, not reproduced | REQ-014 | Implementation reproduces first; if the sign-in read never ends (a product bug), it returns as Design Impact | Open |
| R-02 | Risk | Overlap with autobyteus-416 (WebView, HTML preview) | REQ-007 | Teams resolve at merge (Task constraint) | Accepted |

## Requirement Implications

- Item 4 is superseded by 395 (E-04): dropped with evidence.
- Item 8 must apply only to newly entered paths; reading or restoring an already registered path keeps working unchanged (E-08; Task: no change to stored data).
- Item 11's premise is wrong (E-11): the requirement is the probe outcome, not a proxy handler.
- Item 9 needs a new server read: round 2. Item 16's Product text arrived (SR-003) and joined round 1; item 15 dropped (DEC-011).

## Architecture Investigation Findings

(Appended during design; see the design spec's references.)

- A-01 `AgentPackageDefinitionChangeFeed` is retained only through `useAgentPackageDefinitionChangeFeed(enabled)`; `app.vue` is its only caller. `isMobileRemoteAccessRuntime()` and `useMobileNodeSessionStore().isPaired` are the existing signals for "phone runtime" and "paired".
- A-02 `rejectLocalSessionForAuthFailure` clears storage and sets `lastDiagnostic = auth_required`; the pairing screen does not read `lastDiagnostic` (E-02), so a rejected session shows the ordinary pairing screen.
- A-03 Android `Activity.onSaveInstanceState(Bundle)` runs before the process may be killed in the background; `onCreate(savedInstanceState)` receives it after process death. The saved URL must pass `TrustedNavigationPolicy` for the same saved entry before it is loaded (the policy is the WebView's single navigation owner).
- A-04 The WebView's `WebResourceRequest.isForMainFrame` distinguishes subframes; a `blob:` URL's origin is the part after `blob:` (`blob:http://host:port/uuid`).
- A-05 The GraphQL `createWorkspace` resolver is the only entry for user-entered paths and also for restore/registration; the registry (`WorkspaceRegistryStore`) knows which root paths are already registered (`getRootPathByWorkspaceId`, upserted entries) and `activeWorkspaces` holds the active ones.
- A-06 `useLocalization()` exposes `resolvedLocale`; existing tests mount with a localization fixture.

- A-07 (SR-005, measured by implementation, `evidence/IMP-02-apollo-403-error-shape.txt`): a phone's GraphQL read refused by the node arrives as Apollo 3.14 `ApolloError` "Response not successful: Received status code 403" with the code only in `networkError.result.code` (status in `networkError.statusCode`); `runHistoryLoadActions.fetchTree` keeps only the message (`:150-152`) and `readHistory` returns that string (`useRunHistorySectionLoad.ts:38`). E-02's design premise (the refusal code reaches `checkStatus`) was wrong; today's 401 rule works only through the "401" in the message. `Measured` (stub fetch, real Apollo).
- E-14 correction (SR-005): the runtime row does expose `checkedAt` (`api/graphql/types/agent-runtimes.ts:67`); my "no check-finished field" was wrong. R-01 resolved by implementation: the automatic re-check ends ~108 ms after the update (not a product bug).

- E-19 (item 19, SR-006; Read on `origin/personal` `933163361c`): `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue:23-39`: the status `<p data-testid="event-monitor-file-preview-status">` is inside `<div v-if="!readOnly">` with the composer slots; `handleFilePathAction` (`:97-108`) sets `filePreviewStatus` for every conversation (remote-run message, or the preview result's message). So a read-only conversation computes the status and never shows it. Callers: `AgentWorkspaceSurface.vue:33`, `TeamWorkspaceSurface.vue:32`, `AgentTeamEventMonitor.vue:3`, `MobileRunTargetView.vue:26`. 427 (`ea3fbffc8e`) changed this file and the phone navigation path (`useMobileNavigation` into the preview); the 426 branch's base `6225a734a3` predates it. Source row: `/Users/normy/autobyteus_org/autobyteus-delivery-records/phone-message-file-reference-427-20261107/tickets/done/phone-message-file-reference-open/follow-ups.md` FU-001.

- A-08 (SR-008; Reproduced by API/E2E, verified by the code reviewer, CRR-003 F-API-001; `evidence/api-e2e/API-04-D02-failure-analysis.txt`): the phone's Check never classified its own read: `useRunHistorySectionLoad.readHistory` answers `ok` whenever runs are still listed (`:38`), and a failed read keeps the earlier groups; a quiet poll during the Check's read bumps `workspaceRequestGeneration` (`runHistoryLoadActions.ts:107`) and the Check's failure is dropped (`:189`). History-store state is display state; it cannot carry one call's outcome.
- A-09 (SR-008; Read): a phone credential is authorized on every HTTP GraphQL request without an operation list (`remote-access-route-policy.ts:203-205`); refusals answer `{error, code, message}` (`remote-access-policy-plugin.ts:43-45`). A `{ __typename }` query is the smallest authorized read.
- E-03 correction (SR-008; Measured by API/E2E, API-08): the `/mobile` URL names views (files, messages…) but no run: opening a run is store state, and a fresh run-screen URL lands on the list (277 DS-004, MSP-05). Run B: the native restore reloaded the exact URL, and the page showed the list. Run A: a share-started task re-runs its `ACTION_SEND` on recreation (the activity keeps its starting intent) and shows "This code has expired".
