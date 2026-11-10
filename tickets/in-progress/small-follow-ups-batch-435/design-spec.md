# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (SR-002: ARCH-REV-001 AR-001…004. SR-003: CRR-001 CR-001 — DS-006 entry form 2's premise was wrong: `onLaunched` receives the draft ID; the route now follows the draft's promotion, DS-006b)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-002 (SR-001 plus REQ-005 clarifications DEC-014, DEC-015, AC-005-5…7), approved by the Solution Designer within the direction (user informed in the conversation, 2026-11-10); no `Needs user` decision.
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435/tickets/in-progress/small-follow-ups-batch-435/investigation-notes.md`
- Authorities read (2026-11-10): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root; the only `DESIGN.md`), and through it `autobyteus-server-ts/docs/design/node_access_model.md` (NA-11, NA-13, NAS-37) and `GLOSSARY.md` (vocabulary check). `references/design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

Twelve independent defects in existing owners; none needs a new subsystem. Evidence rows are in the investigation notes' Source Log (cited below as `INV-<n>` = row n).

- Item 1: `app.vue:4-8` mounts `ServerLoading`/`ServerShutdown` when `isEmbeddedWindow` (`windowNodeContextStore.ts:55`), which every browser page is by default (`plugins/20.windowNodeBootstrap.client.ts:5-10`). `ServerLoading.vue:155-158` checks health on mount; outside Electron that is `axios.get` of `new URL('/health', restBaseUrl)` (`browserServerConfig.ts:36-38`, `serverStore.ts:426-430`). `serverStore.initialize()` already skips browsers (`serverStore.ts:96-101`). INV-1…4.
- Item 2: the window's probe (`nodeIdentityProbe.ts:68-87`) maps any thrown fetch to `unreachable`/`refused`; the Host gate answers 403 before CORS (`remote-access-host-gate.ts:26-41`; `build-studio-server.ts:460-464`). Measured: an opaque `no-cors` GET resolves when something answers and rejects when nothing does. INV-5…8.
- Item 5: `SystemBarInsets.pad` pads bars + cutout + IME on every root (`SystemBarInsets.kt:15-25`); `DesktopFullScreenController` owns orientation, bar visibility, root colour (`DesktopFullScreenController.kt:37-52`). INV-11.
- Item 6: `useMobileNavigation` writes only Org keys besides the screen keys (`useMobileNavigation.ts:10-12, 96-104`); `MobilePairedShell.vue:180-184` replaces a subject-less view by the list immediately. INV-12.
- Item 7: one-column paste section (`MobileNodeDesktopClipboard.vue:7-25`); sheet ≤ 85dvh (`MobileBottomSheet.vue:7`). INV-14.
- Items 8, 9: `ConnectionDiagnosticMapper.fromHttpStatus` `else` (`:73-78`); `MainActivity.webCallbacks` Retry → `entry.mobileUrl` (`MainActivity.kt:356-360`); pairing attempt URL in `NodeConnectionFlow` (`:36-42, 135-153`). INV-15, 16.
- Item 10: five stream owners each decide retry on close (`WebSocketClient.ts:16,72`; `agentRunCollaborationStreamingService.ts:94-105`; `agentOrgStreamingService.ts:128-140`; `FileExplorerStreamingService.ts:35-41, 200-215`; Team via `WebSocketClient` → `TeamStreamingService.ts:268-275`). Nothing closes the stream registries on phone session removal (`mobileNodeSessionStore.ts:231-246`; registries `agentRunStore.ts:80,358-366`, `agentTeamRunStore.ts:51,200-207`, `agentRunCollaborationStore.ts:437-452`, `agentOrgContextsStore.ts:122-139`, `workspace.ts:357-359`). INV-17…19.
- Item 11: `refreshListedStatuses` asks listed-active hosts only and skips inactive pairs (`agentRunCollaborationStore.ts:205-239`); `getAgentStatuses` answers `null` digest when inactive (`standalone-agent-run-root-manager.ts:165-172`); `closedTaskExecutionsIn(root)` is an in-memory index (`task-execution-resource-service.ts:200-203`). INV-20.
- Item 12: three definitions (`root-execution-view-dtos.ts:22-26`, `task-execution-reference.ts:7-8`, `taskExecutionClosure.ts:15-16`). INV-21.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: 12 bounded deltas in existing owners across `autobyteus-web` (≈ 20 source files + specs + one probe), `autobyteus-server-ts` (1 service + ≈ 15 import lines), `autobyteus-collaboration-stream-contracts` (1 export), `autobyteus-android` (5 files), 3 docs. No new subsystem, no persistence.
- Architectural risk: `High`
- Risk rationale and supporting evidence: the change alters live-stream lifecycle in all five web stream owners (retry decision on close; a page-wide close on phone session end) — a concurrency/lifecycle change with a broad blast radius (desktop windows use the same owners); it changes the phone's route contract and adds a page-start restore sequence; it changes a GraphQL answer's semantics (`closedTaskExecutionsDigest` for inactive hosts). Each is bounded, but together they are material lifecycle and contract impact, so independent review is warranted.
- Escalation trigger: any need to change Host/Origin/credential rules or CORS; a stream owner whose close handling cannot take the shared classification without restructuring; a restore that needs new server data; Android cutout behaviour that needs a permission or a manifest change.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | INV-1…4 | Overlays mount in every browser; their mount checks health | D-1 | None |
| Probe (Measured) | `/tmp/sd435-probe/probe.mjs` (text in § Concrete Examples) | `file://` page: refused name → opaque resolve; closed port → reject | D-2 | Electron renderer re-check by API/E2E |
| Code read | INV-5…8; one-nodes-tab DEC-709 (b) | Node-side check forbidden while switch off | D-2 | None |
| Code read | INV-11; Android cutout modes | Full screen keeps cutout padding | D-5 | Cutout devices other than the emulator |
| Code read | INV-12, `useMobileRunTree.ts:55-91` | Row keys are stable IDs; tree exposes rows and disclosure | D-6 | Child rows depend on parent's stored view timing |
| Archived runtime | 432 API-08 | 915×151 viewport with keyboard | D-7 | None |
| Code read | INV-15, 16 | Mapper and Retry owners | D-8, D-9 | None |
| Code read + archived runtime | INV-17…19; 446 API-09 | Retry loop via catch-up reads; no teardown | D-10 | None |
| Code read | INV-20 | In-memory closed index per root | D-11 | Not run (as 446); API/E2E runs it |
| Code read | INV-21 | Duplicate key | D-12 | None |

## Intended Change

Fix each item inside its existing owner; add one shared close classification for the web's stream owners and one page-wide stream close for phone session end; carry the open agent/Team subject in the phone route and restore it at page start; answer a stopped host's closed-set digest from memory.

## Change Scope (Mandatory)

- In scope: UC-001 … UC-008. Areas: web app shell overlays (item 1); Nodes page probe + words (2); dead code (3, 4); Android insets/full screen (5), diagnostics (8), pairing Retry (9); phone navigation/restore (6) and Clipboard sheet (7); web stream owners and stream registries (10); run-list status refresh client + server (11); collaboration contracts key (12); probe `mobile-shell-probe.mjs`; docs (`docs/design-cases.md` Case 20 added by the Solution Designer at SR-003, `node_access_model.md` NA-11 sentence, `docs/android_mobile_access.md` hint note, `autobyteus-web/docs/remote_access.md` if it describes the Nodes causes or the phone route).
- Derived consumers: `closedTaskExecutionsDigest` (GraphQL `agentRunCollaborationStatuses`) → its only reader is `agentRunCollaborationHydration.ts:21,34` → `agentRunCollaborationStore.refreshListedStatuses` (decision: reads the inactive digest per D-11). Phone route query → readers: `useMobileNavigation` (only writer/reader of screen keys), `activeWorkspaceTarget` (Org keys, unchanged), Android `OpenPageRestore` (saves/restores verbatim; unchanged). `NodeProbeCause` → `nodeConnectionErrorText.causeText` and its callers `NodeRow.vue:261`, `NodeConnectionDetails.vue:124` (decision: new case handled in `causeText` only). `taskExecutionReferenceKey` → 14 server + 2 web production importers (decision: import from contracts).
- Deliberately left alone: Host/Origin/credential rules and CORS (403, 416, 437); node-side address resolution and its switch rule; phone session ending on a stream close (426 E-27); `ServerMonitor`'s browser health URL (FU-001); Team/Org hosts' list refresh; 401/403 Android overlay texts; other phone screens' landscape layouts; `TaskExecutionReference` type duplicates (types, not the key policy).
- Follow-ups: FU-001, FU-002, FU-003 (`follow-ups.md`).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001 / AC-001-* | Page start | INV-1…4 | Overlays only in the Electron window | DS-001 |
| BEH-002 | User | REQ-003 / AC-003-* | Nodes page open; Add | INV-5…8 | Opaque second request → `window_refused` cause | DS-002 |
| BEH-003 | Contract | REQ-002 / AC-002-1 | — | INV-9, 10 | Removed | — |
| BEH-004 | User | REQ-004 / AC-004-* | Full screen on/off | INV-11 | Cutout used while on | DS-005 |
| BEH-005 | User/System | REQ-005 / AC-005-* | Reload; process-death restore | INV-12, 13 | Route `row` key; restore at page start | DS-006 |
| BEH-006 | User | REQ-006 / AC-006-* | Typing in the sheet | INV-14 | Send beside field in short viewport | — (local layout) |
| BEH-007 | User | REQ-007 / AC-007-1 | HTTP error on the node's page | INV-15 | Plain words | DS-008 |
| BEH-008 | User | REQ-008 / AC-008-1 | Retry on overlay | INV-16 | Retry URL from the flow | DS-009 |
| BEH-009 | System | REQ-010 / AC-010-* | Credential refused close; session removal | INV-17…19 | Final on credential refusal; page-wide close on session end | DS-003, DS-004 |
| BEH-010 | System | REQ-011 / AC-011-* | List refresh | INV-20 | Inactive digest from memory; one re-read per digest | DS-007 |
| BEH-011 | Contract | REQ-012 / AC-012-1 | — | INV-21 | One export | — |
| BEH-012 | Operational | REQ-009 / AC-009-1 | — | 432 comment | Guide note | — |

## Relevant Supplemental Task Artifacts

None (the probe script is reproduced below).

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (items 1, 2, 5–11) and `Cleanup` (3, 4, 12).
- Current design issue found: `Yes` (items 10, 12); `No` for the rest.
- Structural triggers that fire:
  - Repeated coordination (Principle 13) — item 10: the retry-on-close decision repeats in five owners with four different code sets (INV-17). Response: one shared classification of a credential-refusal close; each owner keeps its own existing final codes and asks the classification for the rest.
  - Derived data (Principle 11) — item 12: the same key computed in three places (INV-21). Response: one export.
  - Derived data — item 11: the closed-set digest is computed by the contracts' one function on both sides (unchanged); the inactive answer derives it from the node's index, which is the authority the stored view is filtered from (D-11).
  - Behavior by absence (Principle 13) — checked for item 11: the inactive digest is an explicit answer, not "no digest means unchanged"; the client's once-per-digest rule is explicit state.
  - Several kinds or forms (Principle 1) — item 10 serves five retrying stream kinds (each traced, INV-17); the phone's three other sockets close on session end by their own lifecycle (DS-004 row, AR-003). Item 6 serves agent runs, Team runs, Team members, delegated task rows, Org subjects (Org keys unchanged; others via one row key) and two entry forms: a row tap and Create run (AR-001); restore readiness is named per row kind (DS-006 restore).
  - Behavior by absence (Principle 13) — item 6 (AR-002): the list fallback is decided only after the reads a row depends on have settled; a failed read is its own explicit outcome (DEC-014), not "not found".
  - Ruled out: Authoritative boundary (callers keep using store actions, not services); Persisted-data transition (none); Vocabulary drift (new words `window_refused`, `row` checked below).
- Root cause classification: item 10 `Duplicated Policy Or Coordination` + `Missing Invariant` (no owner closes streams at session end); item 12 `Shared Structure Looseness`; the others `Local Implementation Defect`.
- Refactor needed now: `Yes` for items 10 and 12 (bounded: one shared classification; one export); `No` for the rest.
- Evidence: INV-17, INV-21.
- Design response: D-10, D-12.
- Refactor rationale: adding the new close codes to five owners separately would grow the duplicated policy; one classification keeps them consistent.
- Intentional deferrals and residual risk: the five owners keep their own existing final codes (4004/4005 sets differ by owner on purpose: e.g. collaboration's 4004 means "cannot host"); unifying those is not needed for this scope.

## Terminology

- `window_refused` (probe cause): something answered at the address but refused this window's request (the window cannot read why). Not `host_refused`, which is the node-side, exact cause.
- `credential-refusal close`: a WebSocket close by the node because the client's credential is refused for good: code 4401, or 4403 with `REMOTE_ACCESS_DEVICE_REVOKED`, `NODE_CREDENTIAL_REVOKED`, `NODE_CREDENTIAL_INVALID` or `PEER_UNPAIRED`.
- `row` (phone route key): the run-list row key of the open agent or Team subject (`agent:<id>`, `team:<id>`, `team:<id>/<rowKey>`, `agent:<id>/<rowKey>`), as `MobileRunTreeRow.key`.
- GLOSSARY.md: no existing entry conflicts; no new domain word needs a glossary entry (these are UI/transport terms).

## Legacy Removal Policy (Mandatory)

- Obsolete paths and files: `diagnosticFromWebSocketClose` + its two spec lines; `utils/dateUtils.ts`; the probe's FU-003 health exemption; the server's and web's own `taskExecutionReferenceKey`; `runHistoryStore.activeListedAgentRunIds` and its spec (replaced by all listed IDs, D-11); the collaboration store's inline release loop (moved into `releaseAll`).
- Compatibility wrappers, dual paths, or legacy fallbacks kept: `None`. Old Android saved URLs without `row` simply restore as today (list) — not a compatibility branch, the normal "no subject" path.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. No stored data changes. Android's saved page URL is opaque to the app and read by the web route, which treats a missing `row` as no subject.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | Page start | Overlays mounted or not | `app.vue` | Item 1 |
| DS-002 | Primary | BEH-002 | Nodes page row ask / Add | Row cause words | `nodeListStore` → `probeNodeIdentity` | Item 2 |
| DS-003 | Return-Event | BEH-009 | Node closes a socket | Owner retries or stops | each stream owner + shared classification | Item 10a |
| DS-004 | Primary | BEH-009 | Phone session removed | Every stream closed | `MobileRemoteAccessShell` → `closeAllLiveStreams` | Item 10b. The phone's other sockets already close on session end and are not in `closeAllLiveStreams` (AR-003): `/ws/agent-package-definitions` (feed enabled only while `isPaired`, `app.vue:47-53`), `/ws/projects` (released when the paired shell unmounts, `useTaskWorkerTasks.ts:38`), the VNC socket (closes with `MobileNodeDesktop`, never reconnects by itself) |
| DS-005 | Primary | BEH-004 | Page requests full screen | Root padding / cutout mode | `DesktopFullScreenController` | Item 5 |
| DS-006 | Primary | BEH-005 | Row tap / page start with route | Same subject's screen | `useMobileNavigation` (write), `useMobileSubjectRestore` (restore) | Item 6 |
| DS-006b | Return-Event | BEH-005 | Draft promoted at its first send | Current route entry names the node run | `useMobileRouteRunSync` (when) → `useMobileNavigation.replaceRowKey` (write) | SR-003, CR-001 |
| DS-007 | Primary | BEH-010 | History poll tick | Rows re-read or states applied | `agentRunCollaborationStore.refreshListedStatuses` ↔ `StandaloneAgentRunRootManager.getAgentStatuses` | Item 11 |
| DS-008 | Primary | BEH-007 | WebView main-frame HTTP error | Overlay words | `AutoByteusWebView` → `ConnectionDiagnosticMapper` | Item 8 |
| DS-009 | Primary | BEH-008 | Retry tap | Page load | `MainActivity` → `NodeConnectionFlow.retryUrlFor` | Item 9 |

## Primary Execution Spine(s)

- DS-001: `Nuxt app mount -> app.vue (shows server overlays only when this is the Electron desktop window) -> ServerLoading/ServerShutdown (Electron only) -> serverStore.checkServerHealth -> electronAPI`
- DS-002: `NodeList open / Add -> nodeListStore.ask/addNode -> probeNodeIdentity (readable GET; on non-timeout failure an opaque GET) -> NodeIdentityProbeResult {cause: 'window_refused'} -> NodeRow/NodeConnectionDetails -> causeText (desktop or page words)`
- DS-004: `mobileNodeSessionStore (session -> null) -> MobileRemoteAccessShell watch(isPaired true→false) -> closeAllLiveStreams() -> agentRunStore.disconnectAllAgentStreams / agentTeamRunStore.disconnectAllTeamStreams / agentRunCollaborationStore.releaseAll / agentOrgContextsStore.releaseAll / workspaceStore.disconnectAllFileExplorerLiveStreams -> sockets closed, reconnect schedulers disposed`
- DS-005: `MobileNodeDesktop display.apply(on) -> shell bridge onDesktopFullScreen -> MainActivity fullScreenRequest -> DesktopFullScreenController.setOn(on) -> Display (orientation, bars, cutout mode, root colour) + SystemBarInsets re-apply (IME only while on)`
- DS-006 write, entry form 1 (row tap): `MobileRunList row tap -> useMobileRunOpening.open(row) -> useMobileNavigation.openRun({ orgQuery } | { rowKey: row.key }) -> route ?row=<key>&screen=run -> later views carry the subject keys (Org keys + row)`
- DS-006 write, entry form 2 (Create run, AR-001): `MobileRunSetup createRun -> onLaunched(runId) (useMobileRunSetupController.ts:113-115) -> MobileNewRun emits launched(runId) -> MobilePairedShell.onLaunched(runId) -> useMobileNavigation.openRun({ replace: true, rowKey: agentRunRowKey(runId) }) -> route ?row=agent:<runId>&screen=run`. The phone's New run creates agent runs only (`useMobileRunSetupController.ts:17-19`: "the agent's launch configuration"); no Org or Team is launched there. `agentRunRowKey` is the one writer of the `agent:<id>` format, used by `runListProjection.ts:79,98` and by `onLaunched`. **Correction (SR-003, CRR-001 CR-001):** `runId` here is the draft's `temp-<ts>-<n>` ID (`useMobileRunLaunchCoordinator.ts:50-53` → `agentContextsStore.createRunFromTemplate`, `agentContextsStore.ts:90-111`); the node run exists only after the first send, which re-keys the same context (`agentRunStore.ts:214-223` → `promoteTemporaryId`, `agentContextsStore.ts:160-173`). So entry form 2 writes the draft key and DS-006b makes the route follow the promotion.
- DS-006b (SR-003), the route follows a draft's promotion: `agentRunStore send (first message) -> agentContextsStore.promoteTemporaryId(temp, P) (same AgentContext re-keyed; selection moves temp → P) -> useMobileRouteRunSync (watch, mounted by MobilePairedShell for the page's life) records temp → P -> useMobileNavigation.replaceRowKey(agentRunRowKey(P)) (router.replace of the current entry, every other key kept)`. Detection is the desktop chat's rule (`useChatRouteRunSync.ts:33-44`, D-13): the agent selection moves from R to P **and** `agentContextsStore.getRun(P)` is the same context object the route's `row = agent:R` displayed — only a promotion does that. The composable also keeps the page's promotions (R → P) and, on every route change whose `row` is `agent:R` for a recorded R (Back to an entry pushed before the send: the run screen under a view, the list entry), replaces that entry's `row` with `agent:P` too. So the entry that is current at a reload or at Android's save is always the node's ID, whichever entries were visited. History entries are never rewritten except the current one (the History API allows only that); an entry not visited before a reload keeps the draft key and, if visited after the reload, behaves as any entry whose subject is gone (subject-less view → list), as today. Before the first send there is no promotion: a reload restores nothing (drafts are never listed, `runListProjection.ts:89-91`) and the list shows (DEC-016, AC-005-8) by the existing "not listed after readiness" step.
  - Owner: `useMobileNavigation` stays the only writer of the route (new `replaceRowKey`); `useMobileRouteRunSync` only decides when; the stores stay unaware of the phone route (as the desktop's `useChatRouteRunSync` keeps `agentContextsStore` unaware of `/chat`).
- DS-006 restore (AR-002), driven by `useMobileSubjectRestore` from start to end; the shell only creates it and reads `restoring`:
  1. Setup (synchronous, before the shell's immediate subject-less-view watch runs): `restoring = Boolean(navigation.openRowKey) && screen ∉ {list, new} && !activeWorkspaceTarget`; when true, `opening.begin(rowKey)` so the run screen shows "Opening…" (DEC-015).
  2. `await historyLoad.initialLoad` (passed in). Readiness of the list = `runHistoryStore.error === null` after it (the read's own result; `initialLoad` itself always resolves, `useRunHistorySectionLoad.ts:30-43`). Error → step 6 (DEC-014).
  3. Row kind from the key: top-level (`agent:<id>`, `team:<id>`) → ready now. Team member (`team:<id>/<rowKey>`) → `tree.revealRow(key)` expands the Team's fold and each ancestor team-row fold, found by depth order in `entry.team.executionRows` (already in the history read). Delegated task row (`agent:<id>/<rowKey>`) → `await collaboration.inspect(hostRunId)` unless the host's context is published (the read settles with success or `errors[host]`, `agentRunCollaborationStore.ts:160-185`); a failure → step 6; then `tree.revealRow(key)` expands the run fold and each ancestor task-Team fold (from the published context).
  4. `row = tree.rows.find(r => r.key === key)` once readiness has settled. Found → `opening.reopen(row)` (shared open action, no navigation) → commit: the target opens and the route's screen shows.
  5. Not found after readiness → the subject is gone → `navigation.toList()`.
  6. The list or the host's rows cannot be read → `navigation.toList()`: the list shows its connection state (DEC-014).
  7. Every exit: `restoring = false`; a pending open it began is committed by the open or failed (`opening.fail(key)`).
  No timer anywhere: each wait ends on a read's own settle. A new tap or Back during the restore supersedes it (`opening.begin` of the tap invalidates the restore's intent; the restore checks its key is still pending before acting).
- DS-007: `useRunHistorySectionLoad poll tick -> collaborationStore.refreshListedStatuses(listedAgentRunIds) -> GraphQL agentRunCollaborationStatuses -> StandaloneAgentRunRootManager.getAgentStatuses (active: root's closed set; inactive: index closedTaskExecutionsIn(root)) -> answer -> store: active rule (446) | inactive: digest ≠ view's and ≠ last re-read digest -> inspect(host) once`
- DS-008: `WebView onReceivedHttpError (main frame) -> ConnectionDiagnosticMapper.fromHttpStatus(code, entry.shownName) -> MainActivity.showWebDiagnostic -> WebShellScreen overlay`
- DS-009: `Overlay Retry -> MainActivity.webCallbacks.onRetry -> NodeConnectionFlow.retryUrlFor(entry) (pending pairing's URL, else entry.mobileUrl) -> webHost.loadTrusted(url)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The server overlays describe the embedded server only Electron runs; a browser never mounts them, so it never checks health at start | app shell, server overlays | `app.vue` | `isElectronEnvironment()` |
| DS-002 | The window asks the address; when it cannot read the answer for a reason other than time, it asks once more without reading: an answer means "refuses this window" | Nodes page row, probe | `probeNodeIdentity` | words (`nodeConnectionErrorText`) |
| DS-003 | A stream that the node closed for a refused credential is not reconnected; other closes keep their owner's reconnect | stream owner | each owner | `isCredentialRefusalClose` |
| DS-004 | When the phone stops being paired, the page closes every live stream it holds | phone shell, stream registries | `MobileRemoteAccessShell` | `closeAllLiveStreams` |
| DS-005 | In full screen the page lays out into the cutout; the root keeps only the keyboard inset | full-screen controller, insets | `DesktopFullScreenController` | `SystemBarInsets` |
| DS-006 | The route names the open subject's row, whether a tap or Create run opened it; at page start the restore shows "Opening…", waits for the reads the row depends on (list; a delegated row's host rows), reveals the row and reopens it with the same action a tap uses; a row that is not there after those reads, or reads that fail, give the list | navigation, restore, opening | `useMobileNavigation` (write), `useMobileSubjectRestore` (restore order) | run tree reveal, `agentRunRowKey` |
| DS-007 | A stopped host's closed-set digest comes from memory; the list re-reads the host's view when it changed, once per value | list refresh, root manager | `agentRunCollaborationStore` / `StandaloneAgentRunRootManager` | contracts' digest |
| DS-008 | An HTTP error names the node and what to try | WebView, mapper | `ConnectionDiagnosticMapper` | — |
| DS-009 | Retry reloads the pairing link while the pairing is pending | overlay, flow | `NodeConnectionFlow` | — |

## Spine Actors / Main-Line Nodes

`app.vue`; `nodeListStore`, `probeNodeIdentity`; the five stream owners; `MobileRemoteAccessShell`, `closeAllLiveStreams`, the five registries; `DesktopFullScreenController`, `SystemBarInsets`; `useMobileNavigation`, `useMobileSubjectRestore`, `useMobileRunOpening`; `agentRunCollaborationStore`, `StandaloneAgentRunRootManager`; `ConnectionDiagnosticMapper`; `NodeConnectionFlow`, `MainActivity`.

## Ownership Map

- `app.vue`: which app-level overlays a window shows (decision moves to "Electron desktop window").
- `probeNodeIdentity`: the window's reachability verdict for one address, including the new `window_refused` verdict. It owns both requests and their order.
- Stream owners (`WebSocketClient`/`AgentStreamingService`/`AgentRunStreamReconnection`, `TeamStreamingService`, `AgentRunCollaborationStreamingService`, `AgentOrgStreamingService`, `FileExplorerStreamingService`): each owns its reconnect decision; the shared classification owns only "is this close a credential refusal".
- Registries (`agentRunStore`, `agentTeamRunStore`, `agentRunCollaborationStore`, `agentOrgContextsStore`, `workspace` store): each owns the lifecycle of its streams and gets one close-all action.
- `closeAllLiveStreams`: the sequence "close every registry's streams" (one owner of the fan-out).
- `MobileRemoteAccessShell`: phone session lifecycle reactions (it already watches `isPaired`).
- `DesktopFullScreenController`: everything the window changes for full screen, now including the cutout layout mode and the insets mode.
- `SystemBarInsets`: root padding per mode.
- `useMobileNavigation`: the only writer of the phone route (adds `row`).
- `useMobileSubjectRestore`: the page-start restore sequence (one shot).
- `useMobileRunOpening`: open sequences (adds `reopen`, no navigation).
- `agentRunCollaborationStore`: list refresh decisions (adds stopped-host rule and its once-per-digest state).
- `StandaloneAgentRunRootManager.getAgentStatuses`: the states answer (adds inactive digest).
- `ConnectionDiagnosticMapper`: Android texts. `NodeConnectionFlow`: pending pairing and its URL.

## Thin Entry Facades / Public Wrappers

N/A — no facade is added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `diagnosticFromWebSocketClose` (`mobileConnectionDiagnostics.ts:68-82`) and its spec lines (`__tests__/mobileConnectionDiagnostics.spec.ts:4,14-15`) | Dead: `grep -rn diagnosticFromWebSocketClose autobyteus-web` finds only the definition and its spec | — | REQ-002 |
| `autobyteus-web/utils/dateUtils.ts` | Dead: no importer (`grep -rn dateUtils` outside `.nuxt`/`node_modules`) | — | REQ-002 |
| Probe FU-003 exemption (`mobile-shell-probe.mjs:2203-2212`) | Its cause is removed (D-1) | Strict browser-error rule | AC-001-1 |
| `taskExecutionReferenceKey` in `task-execution-reference.ts:7-8` and `taskExecutionClosure.ts:15-16`; contracts' private `referenceKey` | One export | `@autobyteus/collaboration-stream-contracts` `taskExecutionReferenceKey` | REQ-012; `taskExecutionRunId`, `agentRunKey`, `teamRunKey` stay |
| `runHistoryStore.activeListedAgentRunIds` + `runHistoryActiveListedRuns.spec.ts` | Replaced by all listed agent run IDs (D-11) | `listedAgentRunIds` | Its only caller is `useRunHistorySectionLoad.ts:51` |
| Inline release loop in `agentRunCollaborationStore` binding watch (`:449-452`) | Extracted | `releaseAll()` used by the watch and by `closeAllLiveStreams` | No behavior change |

## Return Or Event Spine(s)

- DS-003: `node closes socket (4401 / 4403+code / other) -> owner's onclose -> isCredentialRefusalClose(code, reason) || owner's final codes ? scheduler.startOver() (no retry) : scheduler.connectionLost() (retry)`. For `WebSocketClient` the `retryable` flag carries it to `AgentRunStreamReconnection` and `TeamStreamingService` unchanged in shape.

## Bounded Local / Internal Spines

- `LiveStreamReconnectScheduler` (parent: each stream owner): `connectionLost -> wait(back-off) -> attempt -> connected | connectionLost | startOver`. Unchanged; only the input classification changes, and `dispose()` is what close-all calls.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spines | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `isCredentialRefusalClose` | DS-003 | stream owners | classify a close | one policy | each owner drifts |
| `causeText` words | DS-002 | probe callers | words per cause and window kind | UI words owner | probe knowing UI |
| `isElectronEnvironment()` | DS-001, DS-002 | `app.vue`, `causeText` | window kind | existing util | — |
| Run tree disclosure | DS-006 | restore | expand a parent to find a child row | existing owner | restore re-implementing disclosure |

## Ownership Boundaries

- Phone shell reacts to session end; registries own their streams: the shell calls `closeAllLiveStreams`, which calls only registry actions (never services).
- Restore uses `useMobileRunOpening` and `useMobileRunTree` boundaries; it does not call selection stores directly.
- Server answer: `getAgentStatuses` reads the index through the existing `taskExecutionResources` port; it never reads the store/tree for inactive hosts.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| Each registry's close-all action | services, reconnection, sockets | `closeAllLiveStreams` | calling `service.disconnect()` or `reconnection.dispose()` from outside the store | add the close-all action (this design) |
| `useMobileRunOpening` | shared selection/subject actions | list, restore | restore calling `useWorkspaceHistorySelectionActions` itself | `reopen(row)` (this design) |
| `probeNodeIdentity` | both fetches | `nodeListStore` | store doing the opaque fetch | — |

## Dependency Rules

- `services/liveStreamLifecycle/*` may import stores for `closeAllLiveStreams` (as `agentRunStreamReconnection.ts` already does); stores must not import `closeAllLiveStreams`.
- Stream owners import `isCredentialRefusalClose` from `services/liveStreamLifecycle/`; it imports nothing app-specific.
- `mobileNodeSessionStore` stays unaware of stream stores (the shell reacts).
- Server: `getAgentStatuses` → `TaskExecutionResourcePort` (existing dependency); no store read.
- Android: `MainActivity` → `NodeConnectionFlow.retryUrlFor`; `DesktopFullScreenController` → `Display` (+ insets re-apply); `SystemBarInsets` does not depend on the controller (it takes a mode provider).

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `isCredentialRefusalClose(code: number, reason: string \| undefined): boolean` | a WebSocket close | classify | code + reason | new, `services/liveStreamLifecycle/credentialRefusalClose.ts` |
| `closeAllLiveStreams(): void` | this page's live streams | close all | none | new, `services/liveStreamLifecycle/closeAllLiveStreams.ts` |
| `agentRunStore.disconnectAllAgentStreams()`, `agentTeamRunStore.disconnectAllTeamStreams()`, `agentRunCollaborationStore.releaseAll()`, `agentOrgContextsStore.releaseAll()` | registry | close all | none | new actions; existing per-id actions unchanged |
| `NodeIdentityProbeResult` cause `'window_refused'` | probe verdict | — | — | `NodeProbeCause` union extended |
| `useMobileNavigation`: `openRun({ orgQuery?, rowKey?, replace? })`, `openRowKey` | phone route | write/read `row` | row key | Every call names its subject with exactly one of `orgQuery` / `rowKey`, the replace (Create run) form included (AR-001) |
| `useMobileNavigation.replaceRowKey(rowKey)` | phone route | replace the current entry's `row`, all other keys kept | row key | SR-003; the only new writer path, still inside the route's only writer |
| `useMobileRouteRunSync()` | draft promotion vs. route | detect a promotion of the displayed draft (desktop D-13 rule) and keep the page's R → P records; call `replaceRowKey` for the current entry at promotion and on any later route change to a recorded `agent:R` | none (reads route `row`, selection, contexts) | SR-003; new composable, mounted once by `MobilePairedShell` |
| `agentRunRowKey(runId): string` (`utils/runListProjection.ts`) | an agent run's list row | the `agent:<id>` key format | agent run ID | one writer of the format (projection and Create run) |
| `useMobileRunOpening.reopen(row)` | open without navigation | restore | `MobileRunTreeRow` | — |
| `useMobileRunTree.revealRow(key): void` | the tree's disclosure | expand the folds on a child row's path; never collapses | row key | uses the existing disclosure / collaboration fold owners |
| `useMobileSubjectRestore({ tree, opening, navigation, initialLoad })` → `{ restoring: Ref<boolean> }` | page-start restore | one shot; owns the order (steps 1–7) | route `row` | new composable; `restoring` is set in setup |
| GraphQL `agentRunCollaborationStatuses[].closedTaskExecutionsDigest` | host's closed set | digest | run ID | now set for inactive hosts too |
| `refreshListedStatuses(listedIds)` | listed hosts | refresh | agent run IDs (all listed) | parameter meaning widened from "listed active" |
| `ConnectionDiagnosticMapper.fromHttpStatus(statusCode, nodeName)` | HTTP failure | words | code + node name | — |
| `NodeConnectionFlow.retryUrlFor(entry): String` | Retry target | — | saved entry | — |
| contracts `taskExecutionReferenceKey(reference)` | task execution | key | `{agentRunId}` \| `{teamRunId}` | exported |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `openRun({orgQuery?, rowKey?, replace?})` | Yes | Yes (exactly one of two, replace included) | Low | assert exactly one for every call |
| `useMobileSubjectRestore` | Yes | Yes (route `row`) | Low | readiness per row kind named in DS-006 restore |
| `refreshListedStatuses` | Yes | Yes | Low | rename the argument `listedAgentRunIds` |
| others | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural | Same Meaning Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| probe cause | `window_refused` | Yes | Yes (distinct from `host_refused`, `network_refused`) | Low | — |
| route key | `row` | Yes | Yes (`MobileRunTreeRow.key`) | Low (Org keys include `agentRunId` meaning an Org member; not reused) | — |
| close classification | `isCredentialRefusalClose` | Yes | Yes | Low | — |
| close-all | `closeAllLiveStreams` | Yes | Yes (`liveStreamLifecycle` area) | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Close classification | `services/liveStreamLifecycle/` (scheduler) | Extend | owns stream lifecycle |
| Close-all fan-out | same area | Extend | same |
| Session end reaction | `MobileRemoteAccessShell` watch | Extend | already watches `isPaired` |
| Restore lookup/expansion | `useMobileRunTree` | Reuse | owns rows and disclosure |
| Restore open | `useMobileRunOpening` | Extend (`reopen`) | owns open sequence |
| Inactive digest | `TaskExecutionResourcePort.closedTaskExecutionsIn` | Reuse | in-memory authority |
| Words | `nodeConnectionErrorText`, localization | Extend | — |
| Window kind | `isElectronEnvironment` (`browserServerConfig.ts:61-63`) | Reuse | — |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| web app shell | overlays | DS-001 | Extend |
| web nodes settings | probe, words | DS-002 | Extend |
| web live stream lifecycle | classification, close-all | DS-003, DS-004 | Extend |
| web phone shell | session reaction, navigation, restore, clipboard | DS-004, DS-006 | Extend |
| web run-list collaboration | refresh rule | DS-007 | Extend |
| server standalone root | statuses answer | DS-007 | Extend |
| contracts | key export | — | Extend |
| Android ui/connection/shell | insets, words, retry | DS-005, DS-008, DS-009 | Extend |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed the draft except the collaboration `releaseAll`).

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why | Redundant Removed | Overlap Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| credential-refusal close test in 5 owners | `services/liveStreamLifecycle/credentialRefusalClose.ts` | live stream lifecycle | one policy | Yes | Yes | a full retry policy (owners keep their own final codes) |
| task-execution key ×3 | contracts `root-execution-view-dtos.ts` | contracts | one key | Yes | Yes | — |
| collaboration release loop | `agentRunCollaborationStore.releaseAll` | store | used twice | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `NodeProbeCause` | Yes | Yes | Low | — |
| statuses answer `closedTaskExecutionsDigest` | Yes, per state (AR-004): active host → the root's closed set (filtered by its tree, as the live view); inactive host → "the Task index's closed executions hosted by this run, not filtered by its stored tree" | Yes | Low (the once-per-digest rule bounds a difference from the stored view) | write exactly these two meanings in the doc comment (`standalone-agent-run-root-manager.ts:106`) and the GraphQL field description |

## Final File Responsibility Mapping

| File | Area | Owner | Concrete Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-web/app.vue` | app shell | app | overlays only in the Electron window (`isEmbeddedWindow && isElectronEnvironment()`) | Modify |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | probe | — | remove FU-003 exemption; add "no refused request from the revoked phone after MSP-13" check (zero `phoneNet` status 401/403 and zero refused sockets labelled with the revoked phone after MSP-13 ends) | Modify |
| `autobyteus-web/utils/nodeIdentityProbe.ts` | nodes | probe | opaque second GET after a non-timeout failure; `window_refused` | Modify |
| `autobyteus-web/utils/nodeConnectionErrorText.ts` | nodes | words | `window_refused` → desktop/page words | Modify |
| `autobyteus-web/localization/messages/{en,zh-CN}/nodesPage.ts` | localization | — | `cause.windowRefused`, `cause.windowRefusedPage` | Modify |
| `autobyteus-web/utils/remoteAccess/mobileConnectionDiagnostics.ts` (+ spec) | phone | — | remove dead function | Modify |
| `autobyteus-web/utils/dateUtils.ts` | — | — | dead | Remove |
| `autobyteus-web/services/liveStreamLifecycle/credentialRefusalClose.ts` | stream lifecycle | — | classification | Add |
| `autobyteus-web/services/liveStreamLifecycle/closeAllLiveStreams.ts` | stream lifecycle | — | close-all fan-out | Add |
| `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` | streaming | agent/Team transport | `retryable = !(final codes) && !isCredentialRefusalClose` | Modify |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` | streaming | collaboration | same rule | Modify |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` | streaming | Org | same rule (close event's code/reason) | Modify |
| `autobyteus-web/services/fileExplorerStreaming/FileExplorerStreamingService.ts` | streaming | file explorer | same rule | Modify |
| `autobyteus-web/stores/agentRunStore.ts`, `agentTeamRunStore.ts`, `agentOrgContextsStore.ts`, `agentRunCollaborationStore.ts` | registries | each | close-all action (collaboration: `releaseAll`, also used by its binding watch) | Modify |
| `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue` | phone | shell | on `isPaired` true→false: `closeAllLiveStreams()` | Modify |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` | phone | navigation | `row` key in subject keys; `openRun({rowKey})`; `openRowKey` | Modify |
| `autobyteus-web/composables/mobile/useMobileRunOpening.ts` | phone | opening | pass `rowKey`; `reopen(row)` | Modify |
| `autobyteus-web/composables/mobile/useMobileSubjectRestore.ts` | phone | restore | one-shot page-start restore; owns steps 1–7 of DS-006 restore | Add |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` | phone | shell | create `useMobileSubjectRestore` in setup (before the subject-less-view watch) with `historyLoad.initialLoad`; that watch acts only when `!restoring`; a view screen with no target while restoring shows the "Opening…" status; `onLaunched(runId)` → `openRun({ replace: true, rowKey: agentRunRowKey(runId) })` | Modify |
| `autobyteus-web/utils/runListProjection.ts` | run list | projection | export `agentRunRowKey(runId)`; its two `agent:` keys use it | Modify |
| `autobyteus-web/composables/mobile/useMobileRouteRunSync.ts` | phone | route sync | DS-006b (promotion detection as `useChatRouteRunSync.ts`; R → P records; replace current entry) | Add (SR-003) |
| `autobyteus-web/composables/mobile/useMobileNavigation.ts` (SR-003 delta) | phone | navigation | `replaceRowKey(rowKey)` | Modify |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` (SR-003 delta) | phone | shell | mount `useMobileRouteRunSync()` once | Modify |
| `autobyteus-web/composables/mobile/useMobileRunTree.ts` | phone | tree | `revealRow(key)` | Modify |
| `autobyteus-web/components/mobile/views/MobileNodeDesktopClipboard.vue` | phone | sheet | short-viewport row layout; keep row in view on focus | Modify |
| `autobyteus-web/stores/agentRunCollaborationStore.ts` | run list | refresh | all listed hosts with a context; stopped-host rule; once-per-digest map (cleared on release) | Modify |
| `autobyteus-web/composables/runHistory/useRunHistorySectionLoad.ts`, `stores/runHistoryStore.ts` | run list | — | pass `listedAgentRunIds`; replace getter | Modify |
| `autobyteus-web/utils/collaboration/taskExecutionClosure.ts`, `services/teamExecution/teamExecutionViewState.ts` | web | — | import key from contracts | Modify |
| `autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts` (+ index export if needed, + a node test) | contracts | — | export `taskExecutionReferenceKey` | Modify |
| `autobyteus-server-ts/src/standalone-agent-run-root/services/standalone-agent-run-root-manager.ts` | server | root manager | inactive digest from `closedTaskExecutionsIn(createAgentRootExecutionIdentity(runId))` | Modify |
| `autobyteus-server-ts/src/api/graphql/types/agent-run-collaboration.ts` | server | GraphQL | field description | Modify |
| `autobyteus-server-ts/src/agent-collaboration/execution/task/task-execution-reference.ts` + its 14 production and 4 test importers | server | — | remove key; import from contracts | Modify |
| `autobyteus-android/.../ui/SystemBarInsets.kt` | Android | insets | mode provider: full screen → IME only | Modify |
| `autobyteus-android/.../ui/DesktopFullScreenController.kt` | Android | full screen | `Display.setLayoutInCutout(on)` (API ≥ 28: `SHORT_EDGES` on, `DEFAULT` off) and insets re-apply on toggle | Modify |
| `autobyteus-android/.../MainActivity.kt` | Android | activity | pass mode provider to `SystemBarInsets.pad`; Retry via `flow.retryUrlFor` | Modify |
| `autobyteus-android/.../connection/ConnectionDiagnosticMapper.kt`, `ConnectionValidator.kt`, `web/AutoByteusWebView.kt` | Android | words | `fromHttpStatus(code, nodeName)` + words (DEC-006) | Modify |
| `autobyteus-android/.../shell/NodeConnectionFlow.kt` | Android | flow | keep the pending pairing's URL; `retryUrlFor` | Modify |
| `autobyteus-server-ts/docs/design/node_access_model.md` | docs | — | NA-11: "a client does not reconnect a socket closed for a refused credential (4401, or 4403 with a revocation code)" | Modify |
| `docs/android_mobile_access.md` | docs | — | full-screen hint note (REQ-009); restore note | Modify |
| `autobyteus-web/docs/remote_access.md` | docs | — | session end closes streams; route `row` (if it documents the route) | Modify if applicable |

## Applied Patterns

- Strategy-free: a plain classification function and a fan-out function; no registry or framework.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping; new files only under existing folders (`services/liveStreamLifecycle/`, `composables/mobile/`).

## Folder Boundary Check

| Path | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `services/liveStreamLifecycle/` | Off-Spine Concern | Yes | Low | already the stream-lifecycle area |
| `composables/mobile/` | Main-Line (phone) | Yes | Low | sits beside navigation/opening |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Item 2 probe | `try { r = await fetch(url, {signal}) } catch (e) { const reason = windowFailureReason(e, base); if (reason === 'timeout') return {ok:false, cause:'timeout'}; const answered = await fetch(url, {mode:'no-cors', signal: AbortSignal.timeout(T)}).then(() => true, () => false); return {ok:false, cause: answered ? 'window_refused' : reason} }` | asking the own node (switch rule), or adding CORS to the Host gate | measured semantics: refused name → opaque resolve |
| Item 10 owner | `const retryable = !NON_RETRYABLE_CLOSE_CODES.has(e.code) && !isCredentialRefusalClose(e.code, e.reason)` | `if (e.code === 4403) final` (would stop Phone-Access-off resume) | DEC-008 |
| Item 10 close-all | `closeAllLiveStreams = () => { useAgentRunStore().disconnectAllAgentStreams(); useAgentTeamRunStore().disconnectAllTeamStreams(); useAgentRunCollaborationStore().releaseAll(); useAgentOrgContextsStore().releaseAll(); useWorkspaceStore().disconnectAllFileExplorerLiveStreams() }` | the shell reaching into `streamingServices` maps | boundary |
| Item 6 route | `?row=agent:run-1&screen=desktop&full=1` | storing the run in sessionStorage | route is the screen state (277 DS-004) |
| Item 6 Create run | `const onLaunched = (runId: string) => { void navigation.openRun({ replace: true, rowKey: agentRunRowKey(runId) }) }` | `` openRun({ replace: true, rowKey: `agent:${runId}` }) `` (a second spelling of the format) | AR-001 |
| Item 6 restore | `const restoring = ref(Boolean(key) && !isListOrNew && !target); if (restoring.value) opening.begin(key); void (async () => { await initialLoad; if (history.error) return finish(toList); if (isTaskRowKey(key) && !collaboration.contextFor(host)) { await collaboration.inspect(host); if (collaboration.errors[host]) return finish(toList) } tree.revealRow(key); const row = tree.rows.value.find(r => r.key === key); return finish(row ? () => opening.reopen(row) : toList) })()` | `setTimeout(lookup, 3000)`; or `if (!row) toList()` right after `initialLoad` | AR-002 (no timer; readiness per kind) |
| Item 11 client | `if (!answer.isActive && !context.isActive) { const d = answer.closedTaskExecutionsDigest; if (d && d !== closedTaskExecutionsDigest(context.view.closed_task_executions) && rereadDigest.get(host) !== d) { rereadDigest.set(host, d); void inspect(host) } continue }` | re-read every poll while digests differ | RSK-002 |

Probe script (feasibility, `/tmp/sd435-probe/probe.mjs`, run with `node`): a local `http` server answering 403 without CORS for any Host but `127.0.0.1`, a Playwright Chromium page at `file:///tmp/sd435-probe/page.html`, and for each URL a readable `fetch` then a `fetch(url, {mode:'no-cors'})`. Output: allowed `{cors:'ok 200', noCors:'resolved type=opaque status=0'}`; refused `{cors:'TypeError: Failed to fetch', noCors:'resolved type=opaque status=0'}`; closed port `{cors:'TypeError…', noCors:'TypeError…'}`.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `activeListedAgentRunIds` beside a new getter | callers/tests | Rejected | one getter `listedAgentRunIds` |
| Re-export the key from the server/web modules | fewer import edits | Rejected | import from contracts |
| Accept old phone route keys | old saved Android URLs | N/A | no old subject key existed; missing `row` is the normal no-subject path |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Item 12 (contracts export; server/web imports) and items 3, 4 (removals) — mechanical, suites green.
2. Item 1 (app.vue) + remove probe exemption.
3. Item 10: classification + owners; registries' close-all; `closeAllLiveStreams`; shell watch; probe check.
4. Item 11: server inactive digest; client refresh rule; getter replacement.
5. Item 2: probe + words (en, zh-CN).
6. Item 6: navigation key, `reopen`, restore composable, shell ordering; then item 7 layout.
7. Android items 5, 8, 9 (+ unit tests).
8. Docs (NA-11 sentence, phone guide notes).

## Key Tradeoffs

- Item 2: window-only check is truthful but not exact; exactness would need a node-side request, forbidden while the switch is off.
- Item 10: Phone Access off keeps retrying (back-off ≤ 30 s) so it resumes by itself; accepted cost.
- Item 6: restore waits only on reads that settle by themselves (the first history read; a delegated row's host view read) — no timer; a failed read gives the list with its connection state (DEC-014) rather than a wait that the list's Retry could not end.
- Item 11: a stale index entry costs one extra stored read per digest change, never a loop.

## Risks

- Item 10 blast radius on desktop windows: a desktop window whose owner credential is revoked stops reconnecting (desired); network/node restarts still reconnect (preserved; unit tests per owner).
- Item 6: the subject-less-view redirect is `immediate` (`MobilePairedShell.vue:165-167`); `restoring` is set synchronously in setup before that watch is registered, so the redirect cannot run first (spec: mount with `?row=…&screen=desktop` and no target → no `toList` until the restore decides).
- Item 5: API 26–27 has no cutout API; full screen there behaves as today (no cutout to use).

## Guidance For Implementation

- Reproduction to start from: `pnpm -C autobyteus-web test:e2e:mobile-shell` (today: the health failed request is counted only by the FU-003 exemption; the revoked phone's 401 lines after MSP-13 fail the verdict). After removing the exemption and adding the post-MSP-13 check, the probe fails on base and must pass after items 1 and 10. Item 2: the probe script above.
- Tests (TESTING.md): unit specs per owner (5 stream owners' close handling; close-all; restore: ordering against the immediate watch, each row kind's readiness, failed list read → list, failed host read → list, row absent after readiness → list, "Opening…" while restoring; Create run → route `row` (AR-001); SR-003: a test that follows a real draft (`createRunFromTemplate`, not a stubbed ID) through `promoteTemporaryId` — route `row` is `agent:temp-…` before the send and `agent:<P>` after it on the current entry, on a view pushed before the send, and on Back to the run-screen and list entries pushed before it; a reload before the send restores the list (AC-005-8); a selection change that is not a promotion (another run opened) does not rewrite the route; probe causes; words; clipboard layout class at a short viewport; server `getAgentStatuses` inactive digest with a store spy proving no tree read; store refresh once-per-digest; Android mapper, flow retry URL, controller/insets mode). Executable: full phone probe; Android emulator checks for AC-004-1, AC-005-2, AC-006-1, AC-008-1; a node started without the window's name in AUTOBYTEUS_ALLOWED_HOSTS for AC-003-1 in the Electron app.
- File size (500-line limit; counts on base `310fc27452`): `agentRunStore.ts` 506, `agentOrgStreamingService.ts` 516 and `standalone-agent-run-root-manager.ts` 516 are already over: this change must not grow them (net ≤ 0 lines each; e.g. `disconnectAgentStream` and the new close-all share one small per-stream disposal, the Org close condition replaces the current one, the inactive digest replaces the current ternary). `agentTeamRunStore.ts` (492) and `agentRunCollaborationStore.ts` (458) must stay ≤ 500 (put the stopped-host rule in a small helper beside the store if it would cross). The old excess is FU-002.
- DESIGN.md rule 12: no new cross-package import edge (server and web already import the contracts package); no gate change.
