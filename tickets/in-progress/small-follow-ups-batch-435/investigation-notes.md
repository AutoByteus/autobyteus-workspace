# Investigation Notes

## Investigation Meta

- Package identifier: `small-follow-ups-batch-435` (Project Task `autobyteus-435`)
- Request / ticket: autobyteus-435, "Small follow-ups, second batch (from autobyteus-426)", with comments adding items 5–12 (from autobyteus-432, -433, -436, -446)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435`
- Resolved base remote / branch / revision: `origin/personal` @ `310fc27452be3d3f44459c89f59c70d8ff40ea02` (fetched 2026-11-10; the batch's source tickets 426, 432, 433, 436, 446 are all merged on `personal`)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created with `git worktree add -b codex/small-follow-ups-batch-435 … origin/personal` (2026-11-10). No earlier 435 worktree or branch existed.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-10): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`. Architecture gate: see design-spec `Authorities read`.
- Investigation status: Complete for requirements and design (all 12 items traced by reading; item 2's feasibility measured; item 1's stated cause corrected).

## Initial Request And Clarifications

- Original request: the Task description (items 1–4 from autobyteus-426's follow-ups) and four comments (items 5–7 from 432, 8–9 from 433, 10 from 436/446, 11–12 from 446). Full rows: 426 `follow-ups.md` (Task context file), 432/433/446 rows under `/Users/normy/autobyteus_org/autobyteus-delivery-records/…`, 436 row in `_delivery-receipts/phone-registered-folders-436/…/follow-ups.md`.
- Clarifications received: none needed from the user. The Task notes say the batch waited for the user's word; the Task Manager dispatched it (status `IN_PROGRESS`, assignment `accepted`), which carries that word. The 446 comment marks item 10 "SCHEDULE SOON".
- User-supplied facts and constraints: no change to the security rules (autobyteus-403, -416); no CORS headers on Host-gate refusals without the user's security decision; no new Android permission; tests; follow DESIGN.md and TESTING.md; release only on the user's word. "Done when": each item done or dropped with evidence; tests; finalized on the base branch.
- Initial ambiguity: item 1's stated cause (plugin → `serverStore.initialize()`) is contradicted by the code (see INV-01); item 2's lead ("have the window ask its own node") conflicts with the one-nodes-tab switch-off rule when Remote Collaboration is off (INV-02); item 6's lead leaves "re-enter full screen?" open; item 10's lead ("treat 4403 as final") would also end the automatic resume after Phone Access is turned back on (INV-10).

## Product And Domain Understanding

- Product area: the phone web shell (`/mobile`), the Android app (`autobyteus-android`), the desktop Nodes page, the run list's delegated rows, shared collaboration contracts.
- Affected actors or systems: phone user (browser or Android app), desktop owner on the Nodes page, the node (server), the full phone probe (`test:e2e:mobile-shell`).
- Relevant terminology: *Host gate* (autobyteus-416; refuses a request addressed to a name the node does not serve, 403 `REMOTE_ACCESS_HOST_REFUSED`, before CORS); *closed-set digest* (autobyteus-446; a short fingerprint of a host run's closed task executions); *session removal* (the phone's paired session cleared: revoked/unknown credential found by a check, or Unpair).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Code | `autobyteus-web/plugins/10.serverStore.client.ts`, `stores/serverStore.ts:93-101` | Item 1 stated cause | `initialize()` returns at once outside Electron ("Not in Electron environment. Skipping server initialization."), sets RUNNING; it requests nothing. Present since `b1c89884e6` (flatten). | Find the real requester |
| 2026-11-10 | Code | `app.vue:4-8`, `components/server/ServerLoading.vue:150-170`, `stores/windowNodeContextStore.ts:55`, `plugins/20.windowNodeBootstrap.client.ts` | Item 1 | `app.vue` mounts `ServerLoading` and `ServerShutdown` when `isEmbeddedWindow`; in any browser (phone included) the window context is the default embedded entry, so `isEmbeddedWindow` is true. `ServerLoading`'s `onMounted` calls `serverStore.checkServerHealth()` after 2 s whatever the status (its `v-if` only hides its own markup). In a browser that is `axios.get(urls.health)` with `urls.health = new URL('/health', restBaseUrl)` = `http://localhost:8000/health` for the default build. One request per page start, as in the evidence. | Design: these overlays are Electron-only |
| 2026-11-10 | Runtime (archived) | `tickets/done/small-follow-ups-batch-426/evidence/api-e2e/API-04-run2/mobile-shell-probe.json`, `…/delivery/DEL-01-mobile-shell/mobile-shell-probe.json` | Item 1 evidence | `failedRequests`: `{'case':'setup','label':'phone','url':'http://localhost:8000/health','error':'net::ERR_CONNECTION_REFUSED'}` on each phone page start | Probe has an FU-003 exemption to remove (`tests/e2e/mobile-shell-probe.mjs:2203-2212`) |
| 2026-11-10 | Code | `autobyteus-server-ts/src/api/rest/health.ts`, `src/api/rest/index.ts` | Item 1 URL | The node serves health at `/rest/health` only; `new URL('/health', 'http://x/rest')` is `http://x/health` (404 on a node). Browser `ServerMonitor` (Settings) "check health" uses the same wrong URL. | FU-001 (follow-up) |
| 2026-11-10 | Code | `utils/nodeIdentityProbe.ts`, `stores/nodeListStore.ts:136-160, 206-230` | Item 2 | The window probes `GET <address>/rest/remote-access/status` cross-origin; a fetch that throws becomes `unreachable` (or `refused` on loopback). The Host gate's 403 carries no CORS header, so a refused name is indistinguishable from no answer. | — |
| 2026-11-10 | Code | `autobyteus-server-ts/src/api/security/remote-access-host-gate.ts`, `node-access-plugin.ts:39-50`, `remote-access-request-origin.ts:21-50` | Item 2 | Host gate runs first (no CORS). Origin rule admits no Origin, `file://` (the desktop app), the node's own origin, or configured origins; refused origins also get a 403 without CORS. `NODE_NETWORK_REFUSED` is answered after `@fastify/cors`, so it is readable (the probe already reads it). | Desktop window origin is `file://`: every node admits it, so the only unreadable answer from an AutoByteus node to the desktop window is its Host gate |
| 2026-11-10 | Code | `remote-collaboration/channel/peer-client.ts:268-300`, `settings/peer-address-resolver.ts`, `utils/nodeConnectionErrorText.ts:19-31` | Item 2 lead | The node already classifies `PEER_HOST_REFUSED`/`host_refused` for server-checked flows (add peer, change address; autobyteus-426 REQ-020), and the web has the words `cause.hostRefused`. Server-side resolution refuses with `REMOTE_COLLABORATION_OFF` while the switch is off. | — |
| 2026-11-10 | Doc | `tickets/done/one-nodes-tab/design-spec.md:234-240`, `requirements-doc.md:187` (DEC-709 (b)) | Item 2 lead | "A server resolves addresses only while its switch is on"; 191 REQ-101 "an off node sends no cross-node requests". Off is every node's default. | A node-side check would work only with the switch on, or would change an approved rule |
| 2026-11-10 | Code | `utils/remoteAccess/mobileConnectionDiagnostics.ts:68-82`, `grep -rn diagnosticFromWebSocketClose autobyteus-web` | Item 3 | Only its own spec imports it. | Remove |
| 2026-11-10 | Code | `utils/dateUtils.ts`, `grep -rn dateUtils autobyteus-web` (outside `.nuxt`, `node_modules`) | Item 4 | No importer, no spec. | Remove |
| 2026-11-10 | Code | `autobyteus-android/.../ui/SystemBarInsets.kt`, `ui/DesktopFullScreenController.kt`, `app/build.gradle.kts` (min 26, target 35) | Item 5 | Every shell root pads system bars + display cutout + IME. In full screen the bars are hidden (their insets are 0), so the left 136 px cutout padding remains; the controller darkens the root so it does not show as a light strip. | Design: full screen pads only the IME and lays out into the cutout |
| 2026-11-10 | Code | `composables/mobile/useMobileNavigation.ts` (SCREEN_KEYS, ORG_KEYS), `components/mobile/MobilePairedShell.vue:180-185`, `composables/mobile/useMobileRunOpening.ts` | Item 6 | Phone screens keep only an Org's keys in the route; an agent run or a Team run is held in memory (`activeContextStore`). A view screen whose subject is gone is replaced by the list. So a reload or a process-death restore of any agent/Team run screen (run, messages, files, activity, artifacts, desktop) lands on the list. | — |
| 2026-11-10 | Runtime (archived) | `tickets/done/phone-viewer-landscape-fullscreen/evidence/API-07b-ac004-restored-run.txt` (432) | Item 6 | After process death the app reopened `/mobile/?screen=desktop&full=1` and the page showed Home. | — |
| 2026-11-10 | Code / Runtime (archived) | `components/mobile/views/MobileNodeDesktopClipboard.vue`, `components/mobile/MobileBottomSheet.vue` (`max-h-[85dvh]`), 432 `evidence/API-08-ac005-keyboard-clipboard.txt` | Item 7 | With the keyboard open in landscape full screen the page viewport is 915×151 CSS px; the sheet is ≤ 128 px tall (header ≈ 68 px), so its scroll area is ≈ 60 px. The paste field (3 rows) is above Send in one column; focusing the field scrolls the field, not Send, into view. | Design: Send beside the field in a short viewport, kept in view on focus |
| 2026-11-10 | Code | `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt:59-80`, `web/AutoByteusWebView.kt:137-145`, `connection/ConnectionValidator.kt:33-35` | Item 8 | The WebView overlay shows `fromHttpStatus`'s text directly; its `else` branch reads "AutoByteus returned HTTP <code>" / "…mobile shell could not load successfully." / "Verify the saved URL, Phone Access state, …". The validator's use is shown through `cantReachReasonFor` (Can't reach screen words), not these texts. | Wording change only in the overlay's `else` branch |
| 2026-11-10 | Code | `MainActivity.kt:188-209, 356-360`, `shell/NodeConnectionFlow.kt:36-155` | Item 9 | The overlay's Retry loads `entry.mobileUrl` always. For a pairing link the page was opened with the link's URL (`Attempt.url`, `Save.OnPaired`) and `pendingPairing` holds the entry until the page reports paired. The one-time code is exchanged by the page's script, so a first page that never loaded did not use it. | Retry while the pairing is pending loads the pairing URL |
| 2026-11-10 | Code | `services/agentStreaming/transport/WebSocketClient.ts:16,72`, `agentRunStreamReconnection.ts:37-42, 74-90`, `TeamStreamingService.ts:268-275`, `agentCollaboration/agentRunCollaborationStreamingService.ts:94-105`, `agentOrgExecution/agentOrgStreamingService.ts:128-140`, `fileExplorerStreaming/FileExplorerStreamingService.ts:35-41, 200-215` | Item 10 | Five stream owners decide retry separately: agent/Team (`WebSocketClient`: final only 4004/4005), collaboration (final only 4004), Org (never final), file explorer (4004/4005 + server codes). A refused credential closes with 4401 (missing/invalid) or 4403 + refusal code (`node-access-refusal.ts:53-54`, `open-socket-registry.ts:25-31`). After a retryable close the agent stream's catch-up reads `GetRunProjection` + `GetRunFileChanges`; refused, they call `connectionLost()` → retry with back-off up to 30 s, for ever. | — |
| 2026-11-10 | Code | `stores/mobileNodeSessionStore.ts:231-246`, `components/mobile/MobilePairedShell.vue:108-160`, `MobileRemoteAccessShell.vue:3-14, 62-64` | Item 10 | Session removal (`rejectLocalSessionForAuthFailure` after a check, `deleteLocalSession` on Unpair) clears the credential; the paired shell unmounts (its history poll stops on unmount, `useRunHistorySectionLoad.ts:88-90`), but the run streams live in stores (`agentRunStore` `streamingServices`, `agentTeamRunStore` `teamStreamingServices`, `agentRunCollaborationStore` services, `agentOrgContextsStore`, `workspace` file-explorer streams) and nothing closes them. | Design: one phone-side teardown on session end |
| 2026-11-10 | Code | `autobyteus-server-ts/src/remote-access/services/phone-credential-verifier.ts:28`, `paired-device-service.ts:107,122` | Item 10 | Turning Phone Access off closes every phone socket with 4403 `PHONE_ACCESS_DISABLED`; revoking closes with 4403 `REMOTE_ACCESS_DEVICE_REVOKED`. Today a phone's streams resume by themselves when Phone Access is turned back on (retry). | Keep that: only credential refusals are final |
| 2026-11-10 | Runtime (archived) | 446 `evidence/API-09-unauthorized-reads/API-09-unauthorized-reads.json`, `evidence/API-08-mobile-shell-probe/mobile-shell-probe.json`; 436 `evidence/api-e2e/API-01-mobile-shell/server-alpha.log:461-544` | Item 10 | After MSP-13 the revoked phone sends 15 `GetRunProjection` + 15 `GetRunFileChanges` in 46 s (401); 48 unknown 401 console lines in MSP-21…26 make the full probe `Fail`. | Probe gets a check: no 401 from the revoked phone after MSP-13 |
| 2026-11-10 | Code | `stores/agentRunCollaborationStore.ts:197-240`, `standalone-agent-run-root-manager.ts:160-172, 311-330, 433-437`, `agent-collaboration/execution/task/task-execution-closure.ts:10-15`, `projects/services/task-execution-resource-service.ts:200-203` | Item 11 | The list's refresh asks only hosts listed active or with a live context, and skips an answer when both sides are inactive; the node answers an inactive host `closedTaskExecutionsDigest: null`. The closed set of a stopped host's stored view is `closedTaskExecutionsIn(root)` (an in-memory per-root index of the Task records) filtered by the stored tree. | Design: answer the digest of the in-memory index for an inactive host (no tree read); re-read a stopped host's view once per changed digest |
| 2026-11-10 | Code | `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts:22-26`, `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-reference.ts:7-8`, `autobyteus-web/utils/collaboration/taskExecutionClosure.ts:15-16`; `grep -rln taskExecutionReferenceKey` | Item 12 | Three identical definitions; server's has 14 production importers + 4 test files; web's has 2 importers (`taskExecutionClosure.ts` itself and `teamExecutionViewState.ts`). Both packages already depend on the contracts package. | Export once from the contracts |
| 2026-11-10 | Command | `/tmp/sd435-probe/probe.mjs` (Playwright `chromium`, a `file://` page; a local server that answers 403 without CORS for any Host but `127.0.0.1`) | Item 2 feasibility | see Runtime findings | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Any browser page start (phone `/mobile`, browser window) | App mounts the server overlays (embedded-window check), whose mount runs a health check against the build's default REST base | A refused request to `http://localhost:8000/health` per page start (console error on the phone); Electron unaffected | INV-01 | High (Read + archived runtime evidence) |
| BEH-002 | User | Owner opens the Nodes page, or adds a node by typing an address | The window's probe of the address fails cross-origin when the node's Host gate refuses the name | Row/add says "No answer from that address" (can't reach) | INV-02 | High (Read + Measured) |
| BEH-003 | Contract | Source hygiene | `diagnosticFromWebSocketClose` and `utils/dateUtils.ts` have no production caller | Dead code | INV-03, INV-04 | High |
| BEH-004 | User | Android app, VNC Viewer full screen (landscape) | The shown root is padded by the display cutout | The picture is ≈ 136 px narrower than the screen (emulator) | 432 IMP-03/IMP-04 | High |
| BEH-005 | User / System | Reload of a phone page, or Android restores the page after ending the app in the background | The route names no agent/Team run | Agent/Team run screens fall back to the run list (Home); Org screens keep their keys | INV-06 | High (Read + 432 API-07) |
| BEH-006 | User | Landscape full screen, Control, Clipboard sheet, typing in the paste field | Keyboard open: viewport 915×151; Send below the field | Send not visible; the user must lower the keyboard | INV-07 | High (432 API-08) |
| BEH-007 | User | Android app: the node's page answers an HTTP error other than 401/403 | Overlay title "AutoByteus returned HTTP <code>" with technical recovery text | Technical words | INV-08 | High |
| BEH-008 | User | Android app: a pairing link's first page failed; user taps Retry after the node is back | Retry loads the node's plain page | Page opens unpaired; the code is lost | INV-09 | High (Read + 433 API-11 evidence) |
| BEH-009 | System | Phone revoked (or credential refused, or unpaired) while run streams are open | Streams retry for ever; each catch-up read refused 401 | Wasted requests; full phone probe ends `Fail` | INV-10 | High (Read + archived runtime) |
| BEH-010 | System | Run list's 5 s refresh; a Task closed or reopened while its host run is stopped | Inactive hosts are not asked; the node answers no digest for them | Rows stay until reload or opening the host | INV-11 | Medium (Read; not run, as in 446) |
| BEH-011 | Contract | Code structure | The task-execution key is defined three times | Duplication | INV-12 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/app.vue`, `components/server/ServerLoading.vue`, `ServerShutdown.vue` | Server start/stop overlays, intended for the Electron desktop window (comment: "in Electron environment") | Outside Electron nothing must request the health URL at page start | Gate the overlays on the Electron window, not on the embedded entry |
| `autobyteus-web/utils/nodeIdentityProbe.ts` | The window's identity probe and its causes | A new cause for "answered, but refuses this window" | A second, opaque (`no-cors`) GET only when the readable GET threw a non-timeout error |
| `autobyteus-web/utils/nodeConnectionErrorText.ts`, `localization/messages/{en,zh-CN}/nodesPage.ts` | Plain words per cause | New words; desktop reuses `cause.hostRefused` | — |
| `autobyteus-android/.../ui/SystemBarInsets.kt`, `DesktopFullScreenController.kt`, `MainActivity.kt` | Insets owner; full-screen owner | Full screen lays the page into the cutout | `layoutInDisplayCutoutMode` while on (API < 35), and the root's padding reduced to the IME |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts`, `useMobileRunOpening.ts`, `MobilePairedShell.vue` | Route as the phone's screen state; row-open sequence | Route must name the open agent/Team subject; a page start with such a route reopens it | Route keys for agent/Team subjects; a restore step after the first history load using the same open actions |
| `autobyteus-web/components/mobile/views/MobileNodeDesktopClipboard.vue` | Clipboard sheet | Send reachable with the keyboard open in landscape full screen | Layout for short viewports; keep Send in view on focus |
| `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt` | Overlay texts | Plain words, node's name, no address | `fromHttpStatus` needs the node's name for its `else` branch |
| `autobyteus-android/.../shell/NodeConnectionFlow.kt`, `MainActivity.kt` | Pairing link flow; overlay Retry | Retry reloads the pairing link while it has not paired | The flow owns the pending pairing and its URL |
| `autobyteus-web/services/**/…Streaming*.ts`, `WebSocketClient.ts` | Stream close → retry decision | A credential refusal ends retrying | One shared close classification used by the five owners |
| `autobyteus-web/stores/{agentRunStore,agentTeamRunStore,agentRunCollaborationStore,agentOrgContextsStore,workspace}.ts` | Stream registries | Session end closes them all | "Close all" entry per registry and one phone-side caller |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` `getAgentStatuses` | Run list's states read | Digest also for inactive hosts, no tree read | `closedTaskExecutionsIn(root)` via the resource port |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` | Contracts (DTOs, digest) | Export the key | Server and web import it |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Localization: `autobyteus-web/localization/messages/{en,zh-CN}/nodesPage.ts` (new cause words), mobile clipboard strings unchanged.
- Android strings are Kotlin literals in `ConnectionDiagnosticMapper.kt`.
- Probe: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (FU-003 exemption to remove; new no-401-after-revocation check).

### Structural Surfaces

- Phone route query (screen state) gains agent/Team subject keys: a URL shape change on `/mobile` (only this app reads it; Android saves and restores the URL verbatim, `OpenPageRestore`).
- GraphQL `agentRunCollaborationStatuses` answer: `closedTaskExecutionsDigest` becomes non-null for inactive hosts (field already nullable; same type).
- Contracts package export added (`taskExecutionReferenceKey`).
- No persistence, schema, migration, route permission, CORS, Host or Origin rule change.

### Potential Structural Impacts To Investigate

- API or external-contract change: GraphQL field semantics (inactive host digest) — compatible (nullable field, newer value).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none intended. Item 2 adds one opaque GET from the window to the same address the window already probes (no new destination, no credential, no CORS change). Item 9 keeps the pairing URL in memory only (already not saved for a page that has not paired).
- Concurrency or lifecycle change: stream lifecycle (item 10), page-start restore sequence (item 6).
- Deployment, migration, ownership-boundary change: none.
- Confirmed absent, present, or unknown: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `node /tmp/sd435-probe/probe.mjs` (Playwright Chromium, page at `file:///tmp/sd435-probe/page.html`, origin `file://`) | A: allowed name (`127.0.0.1:<port>`, CORS granted); B: refused name (`localhost:<port>`, 403 without CORS); C: closed port (`127.0.0.1:1`) | A: CORS GET ok 200; `no-cors` opaque. B: CORS GET `TypeError: Failed to fetch`; `no-cors` **resolved, type `opaque`, status 0**. C: both `TypeError: Failed to fetch`. | Measured | The window can tell "something answered but refused this window" from "nothing answered" without any server or CORS change (REQ-003) | This note; probe script reproduced in design-spec § Item 2 |
| Archived 426 API-04 probe JSON | Phone page start | `http://localhost:8000/health` refused once per phone start | Reproduced (by 426) | REQ-001 | `tickets/done/small-follow-ups-batch-426/evidence/api-e2e/API-04-run2/mobile-shell-probe.json` |
| Archived 446 API-09 | Revoked phone | 30 refused catch-up reads in 46 s | Measured (by 446) | REQ-010 | 446 evidence |

- Temporary diagnostics: None (the probe ran outside the worktree in `/tmp/sd435-probe`; nothing in the repository was changed).
- Reproduction for implementation to start from: item 1 and item 10 — the full phone probe `pnpm -C autobyteus-web test:e2e:mobile-shell` shows both today (the health line counted as known only through the FU-003 exemption; the revoked phone's 401 lines in MSP-21…). Item 2 — `/tmp/sd435-probe/probe.mjs` (script text in the design spec).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via Task) | Security rules unchanged; no CORS on Host-gate refusals without his decision | Explicit | REQ-003 uses the window only | None |
| Task Manager (446 comment) | Item 10 "SCHEDULE SOON"; prove no 401 after MSP-13 | Explicit | AC-010-3 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Fetch standard, `mode: 'no-cors'` | WHATWG Fetch; Chromium (Electron renderer) | A cross-origin GET with an answer resolves as an opaque response; a network failure rejects | Measured above | Electron's Chromium is the same engine; verified again in the app by API/E2E |
| Android `WindowManager.LayoutParams.layoutInDisplayCutoutMode` | API 28+; Android 15 (API 35) edge-to-edge forces `ALWAYS` for targetSdk 35 | Below 35 the window must ask for `SHORT_EDGES` (or `ALWAYS`) to lay out into the cutout | Android docs (platform behaviour); `build.gradle.kts` target 35, min 26 | Checked on the emulator (API 35) by API/E2E; API < 35 by unit test of the controller |
| WebSocket close codes from the node | autobyteus-437 NA-13 | 4401 missing/invalid credential; 4403 + refusal code otherwise | `node-access-refusal.ts:53-54` | — |

## Persisted Data And State Facts

- Affected stored or external subject: none. Item 11 reads the in-memory Task-record index; no write. Item 6 changes a URL shape that the Android app saves and restores verbatim (old saved URLs still open; without the new keys they behave as today).
- Acceptable loss: N/A.

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A (no Product Design request).

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/tmp/sd435-probe/probe.mjs` (text copied into design-spec § Item 2) | Solution Designer | Feasibility measurement of the opaque GET | REQ-003 | AC-003-* | Disposable | Not behavior-defining |
| Source follow-up rows (426, 432, 433, 436, 446) | Earlier tickets | Problem statements | All | All | Final (archived) | Input only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | In the desktop window an opaque answer could also come from a proxy error page or a non-AutoByteus server without CORS, not only a Host gate | The words must stay true | Words say "something answers … refuses this window", with the AutoByteus hint conditional (DEC-002) | Resolved in requirements |
| RSK-002 | Risk | Item 11: a closed copy in the Task index but not in the stored tree would make the digests differ for ever | A re-read every 5 s | Re-read a stopped host at most once per node digest value (REQ-011) | Resolved in requirements |
| RSK-003 | Risk | Item 6: a restored route may name a run that no longer exists or is not listed | Must not error | Falls back to the list, as today (AC-006-3) | Resolved in requirements |
| UNK-001 | Unknown | Item 5 on a real cutout device in both landscape directions | Emulator is the reference device | API/E2E checks the emulator in both directions; residual noted | Accepted |

## Architecture Investigation Findings

See the design spec for the target; the facts above (Source Log, Technical Facts) are the architecture investigation. Additional architecture facts:

- `useRunHistorySectionLoad` exposes `initialLoad`; the paired shell's first check awaits it (`MobilePairedShell.vue:118-124`), a natural point for the item 6 restore.
- `agentRunCollaborationStore` already has a release-all on `bindingRevision` change (`:449-452`); the same release is the session-end teardown for that store.
- `agentRunStore.disconnectAgentStream`, `agentTeamRunStore.disconnectTeamStream`, `agentOrgContextsStore.releaseContext`, `workspace.disconnectAllFileExplorerLiveStreams` exist per registry.
- `taskExecutionResources` port is already given to the root manager (`closedTaskExecutionsFor`).

## Requirement Implications

- Item 1's fix is not in the plugin (it already skips browsers); it is the overlays' mount condition. REQ-001.
- Item 2 can be done in the window alone; a node-side check would need the switch on (approved rule DEC-709 (b)), so it is not used. REQ-003.
- Item 10: only credential refusals become final; Phone Access off and network refusals keep resuming by themselves (preserved). REQ-010.
- Item 11: digest from the in-memory index; one re-read per changed digest. REQ-011.

## Notes For Architecture Design

- Approved scenario IDs to map: SCN-001 … SCN-012 (requirements doc).
- Constraints: no change to Host/Origin/credential rules (403, 416, 437); no CORS on refusals; no new Android permission; existing saved Android URLs keep opening.
