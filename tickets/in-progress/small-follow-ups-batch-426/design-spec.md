# Design Spec — small-follow-ups-batch-426, round 1

## Solution And Approval Basis

- Current solution revision ID: `SR-006` (ARCH-REV-001 resolved, ARCH-REV-002 Pass on SR-004; SR-005: D-02 Design Impact from implementation, IMP-02)
- Approved requirements baseline: `requirements-doc.md` at SR-003, round-1 rows (REQ-001…003, 005…008, 010…014, 016, 017, 018); approved by the Solution Designer within the direction, the user informed 2026-11-07; DEC-011 decided at the user's word ("i trust your judgement")
- Behavior-defining supplements: the Product spec `phone-setup-remote-node-wording/ui-ux-spec.md` (design commit `0341b3af`), approved by the user ("approved", 2026-11-07) — REQ-016
- User approval of the design: `Not required` (the Task does not ask for it)
- Design status: `Ready`
- Canonical investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-426/tickets/in-progress/small-follow-ups-batch-426/investigation-notes.md`
- Authorities read (2026-11-07): `references/architecture-design.md`, `references/design-principles.md`; project `DESIGN.md` (root; rules 1–12, § Project-specific design documents), `TESTING.md` (outline: test layers, browser probes, rules, evidence), `docs/design-cases.md` (Cases 1–16, for item 13)
- Conflicts or discrepancies: DESIGN.md rule 9 conflicted with Task item 15 → raised as DEC-011, decided (dropped). No other conflict. Discrepancy: the 277 FU-006 row's premise (Vite proxy without an error handler) does not match Vite 7.3.1 (E-11).

## Current-State Read

Each item has an existing owner and a correct boundary; the defects are local rules or missing checks in those owners (investigation E-01…E-18, A-01…A-06):

- Phone web shell: `app.vue` keeps the package-definitions feed open whenever the app is ready (E-01); `MobilePairedShell.checkStatus` applies `isRemoteAccessAuthFailure`, a 401-only rule (E-02); `MobileNodeDesktop.vue` + `useVncSession` own the VNC view and session (E-05).
- Android app: `MainActivity` owns screens and the open page; `NodeConnectionFlow` owns opening a node; `TrustedNavigationPolicy` is the WebView's one navigation rule (E-03, E-07).
- Server: `NodeDesktopViewers.admit` decides admission (E-06); `WorkspaceManager.createWorkspace` registers workspaces for every caller (E-08); `ServerAddressCandidateService` builds the address lists with its own IP checks (E-18).
- Tests/docs: the probe B04, NVP-05, four server E2E tests, two web docs, the design cases (E-10…E-14).
- Web formatting: ~25 call sites use the OS locale (E-17); `scripts/guard-localization-boundary.mjs` already guards raw locale access and runs in every desktop build.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: 14 independent local deltas across the web app (≈30 files, most of them one-line locale arguments in item 17), the Android app (4 files), the server (≈6 files) and tests/docs; each stays inside its existing owner; no new subsystem, runtime owner or persistence.
- Architectural risk: `High`
- Risk rationale: one material security-boundary change: item 7 relaxes the Android WebView's navigation containment (`TrustedNavigationPolicy`) to let `blob:` subframes of the open node's origin load in the app, next to the `AutoByteusShell` bridge; it must keep autobyteus-417's preview isolation (AC-007) and overlaps the open security Task autobyteus-416. Item 2 also changes when the phone drops its credential (sooner, for a revoked one). Everything else is bounded: no persisted-data change, no migration, no new route or GraphQL type; additive contract deltas only (address kind `public`, a `String` the only reader shows by label; error code `WORKSPACE_PATH_REFUSED` on an existing mutation; one log line). No concurrency or deployment change. Independent architecture review is warranted for the WebView rule.
- Escalation trigger: return a `Design Impact` (reclassify) if (a) AR-14's re-check never finishes in the product (R-01), (b) the WebView does not report `isForMainFrame=false` for the preview frame, (c) any item needs a new Android permission, a stored-data change or a new API, or (d) the overlap with autobyteus-416 changes the WebView policy shape.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| E-01, A-01 | `app.vue:43-46`; `stores/mobileNodeSessionStore.ts:103-117`; `utils/remoteAccess/mobileRuntime.ts` | Feed retained while ready; binding moves only with a session | D-01 | — |
| E-02, A-02 | `utils/remoteAccess/remoteAccessAuthFailure.ts`; `MobilePairedShell.vue:100-115`; `MobileRunList.vue:16-30,134` | 401-only rule; `connected` boolean drives bar and banner | D-02 | — |
| E-03, A-03 | `MainActivity.kt:59-89`; `NodeConnectionFlow.kt:71-73,123-134` | Process death reopens `entry.mobileUrl` | D-03 | — |
| E-05 | `useVncSession.ts:80-120`; noVNC `rfb.js:507,2338-2341` | `clipboardPasteFrom`, `clipboard` event | D-05 | U-01 |
| E-06 | `node-desktop-viewers.ts:58-70`; `node-desktop.ts:90-92` | Refusal returns without a log | D-06 | — |
| E-07, A-04 | `AutoByteusWebView.kt:100-131`; `TrustedNavigationPolicy.kt:17-53`; `build.gradle` `minSdk = 26` | Subframe blob blocked; deprecated `shouldOverrideUrlLoading(view, url)` is never called on API ≥ 24 because the request overload is overridden | D-07 | — |
| E-08, A-05 | `workspace-manager.ts:54-102,129-135`; `workspace.ts:111-121`; web `runWorkspaceChoice.ts:99-118`, `runHistoryLoadActions.ts:454-498`, `useMobileLaunchWorkspaces.ts:56-74`, `ChatWorkspaceMenu.vue:402-412` | One registration path for all callers; desktop launch swallows errors into "could not be opened" | D-08 | — |
| E-10 | `fresh-run-auto-approval-probe.mjs:406-425`; `runMemberTree.ts:138-146` | Seeded rows count | D-10 | — |
| E-11 | Vite `config.js:21925`; 277 `UPD-NVP/frontend.log:44-72` | Dev server restarts itself | D-11 | U-02 (origin of the rejection; not needed) |
| E-14 | `agent-runtime-status-service.ts:142-150,271-316,322-350`; `api/graphql/types/agent-runtimes.ts:71-76` | Re-check shows `UP_TO_DATE` before it ends; `checkAll` skips a checking row; account state shows `CHECKING` only for a not-installed row; the row exposes no "check finished" field | D-14 | R-01 |
| E-17 | grep (investigation Source Log); `scripts/guard-localization-boundary.mjs`; `composables/useLocalization.ts:17` | ~25 sites; guard exists; `resolvedLocale` | D-17 | — |
| E-18 | `server-address-candidate-service.ts:6-22,104-121`; `remote-access/services/ip-address-ranges.ts`; `memory-sync.ts:80`, `remote-collaboration-settings.ts:121`; web `MemorySyncCard.vue:36` | Duplicate checks; `? "lan" : "lan"`; web shows `label` | D-18 | — |

## Intended Change

Fix each round-1 item in its existing owner; no new subsystem.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003, UC-005, UC-006, UC-007, UC-008, UC-010, UC-012, UC-016, UC-017, UC-018, UC-019 — file status on read-only conversations (D-19), Phone Setup remote wording (D-16), phone web shell (feed enablement, read-refusal rule, run-list connection state, VNC clipboard sheet), Android (open-page restore, blob subframe rule), server (viewer refusal log, workspace folder check, address classification), web workspace refusal text (phone field, desktop launch error), locale formatting and its guard, probe B04, NVP-05 wait, four server E2E tests, two web docs, design cases.
- Derived consumers: `ServerAddressCandidate.kind` gains `public` → readers: Memory Sync GraphQL `mapCandidate` (passes through), web `memorySyncStore` (`kind: string`, displays `label`) — no change needed; Remote Collaboration uses `baseUrl` only — order changes (public after private/tailnet), intended. `isRemoteAccessAuthFailure` → its only caller `MobilePairedShell` and its spec. `TrustedNavigationPolicy.classify` → `AutoByteusWebView` (two call sites) and `OpenPageRestore` (new). `NodeDesktopAdmission` → the route only.
- Deliberately left alone: the history poll's quiet refresh and live-stream close handling (REQ-002 keeps the 401 rule's points); `diagnosticFromWebSocketClose` (unused, see Follow-ups); the desktop VNC tile; the run-settings seeding rule; `nuxt.config.ts` proxy; iOS; Phone Setup texts for embedded and Docker nodes; item 9 (round 2); existing workspace registry entries.
- Follow-ups: FU-001 (`diagnosticFromWebSocketClose` has no production caller — dead code outside touched files). Recorded in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing (evidence) | Change | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001 / AC-001 | page load, pair, unpair | E-01 | Feed retained only when ready and (not phone runtime or paired) | DS-001 |
| BEH-002 | User | REQ-002 / AC-002, AC-003 | open, Retry, Check | E-02 | Refusal classified; revoked rejects; off keeps session with its banner | DS-002 |
| BEH-003 | System | REQ-003 / AC-004 | process death | E-03 | Saved open page restored through the policy | DS-003 |
| BEH-005 | User | REQ-005 / AC-005 | Clipboard tap | E-05 | Clipboard sheet over `useVncSession` | DS-004 |
| BEH-006 | Operational | REQ-006 / AC-006 | 5th / 3rd stream | E-06 | Registry logs its refusal | DS-005 |
| BEH-007 | User | REQ-007 / AC-007 | preview open | E-07 | Policy allows own-origin blob subframes | DS-006 |
| BEH-008 | User/Contract | REQ-008 / AC-008 | path entry, launch, restore | E-08 | Folder check for unregistered paths; refusal reason surfaced | DS-007 |
| BEH-010/011/014 | Operational | REQ-010/011/014 | test runs | E-10/11/14 | Tests follow the code | — |
| BEH-012/013 | Doc | REQ-012/013 | — | E-12/13 | Docs | — |
| BEH-016 | User | REQ-016 / AC-016 | Phone Setup in a remote node's window | E-16 | Remote key set chosen by node kind | `PhonesPanel/PhoneWayTab → phoneSetupTextKey(phoneAccessStore.kind, path) → t(key, { name })` |
| BEH-019 | User | REQ-019 / AC-019 | tap a file link on a read-only conversation | E-19 | status outside the composer's read-only gate | `AgentConversationFeed file-path-action → AgentEventMonitor.handleFilePathAction → filePreviewStatus → status line` |
| BEH-017 | User | REQ-017 / AC-017 | any view | E-17 | App locale at every site; guard | DS-008 |
| BEH-018 | User | REQ-018 / AC-018 | settings open | E-18 | One range owner; `public` kind; no link-local | DS-009 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | REQ | Relationship | Status |
| --- | --- | --- | --- | --- |
| `product-design-request.md` | Product text request, item 16 | REQ-016 | the request | Done |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md` (+ `visual-references/VIS-001…009`) | Approved remote wording | REQ-016 / AC-016 | Normative strings for D-16 | Approved by the user, 2026-11-07 (Product-owned) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` (items 1–3, 5–8, 14, 17, 18) with `Cleanup` (10–13).
- Current design issue found: `Yes`, small: duplicated IPv4 policy (item 18); one shared rule too narrow (item 2); a check missing in the right owner (item 8).
- Structural triggers that fire:
  - **Duplicated policy** (Principle 13/11): two IPv4 range implementations (E-18) → one owner (`ip-address-ranges.ts`), server-addressing imports it.
  - **Several kinds or forms** (Principle 1): workspace registration has several callers (user entry phone, desktop launch, history restore, metadata registration, run activation, Team launch) — each traced (E-08); the check applies to all unregistered paths, so no form slips past; restore keeps its null semantics. Read refusals have three kinds (401/auth codes, revoked, off) — each gets its own result. Navigation has two frame kinds (main, sub) — the policy takes the frame explicitly.
  - **Behavior by absence** (Principle 13): today "Phone Access off" shows "Connected" because the public status answered; the new rule names `phone_access_off` explicitly.
  - Ruled out: Responsibility overload — `MobileNodeDesktop.vue` (220 lines) would grow with the sheet → the sheet is its own component; `MainActivity.kt` (348) grows by ~15 lines with the decision in a new small owner. Ambiguous boundary — none. Persisted-data transition — none (no stored shape changes).
- Root cause classification: `Missing Invariant` (items 1, 2, 7, 8), `Duplicated Policy Or Coordination` (18), `Local Implementation Defect` (3, 5, 6, 17), tests/docs stale (10–14).
- Refactor needed now: `Yes`, bounded: item 18's single range owner; item 8's split of the find-or-register helper (D-08). Nothing else.
- Evidence: rows above.
- Design response: D-01…D-18 below.
- Intentional deferrals: none.

## Terminology

- **Read refusal** (phone): the node refused a phone read because of its credential (`session_rejected`) or because Phone Access is off (`phone_access_off`). Not a reachability failure.
- **Open page** (Android): the saved node and the `/mobile` URL the WebView shows.
- **Unregistered path**: a workspace root whose ID is neither active nor in the workspace registry.
- Glossary (`GLOSSARY.md`): no new domain word; "public address" is plain English, not a domain term.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: `isLanIp`, `isTailnetLikeIp` (server-addressing); `isRemoteAccessAuthFailure` (replaced); the deprecated `shouldOverrideUrlLoading(view, url)` override (dead on minSdk 26).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`. The workspace registry is read, never rewritten (DEC-004); saved nodes, credentials, run history unchanged. The Android saved-instance Bundle is system-held transient state for one task, not app data.

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001 | app ready / session change | feed socket open or closed | `app.vue` (enablement) → `NodeChangeFeed` | no unpaired retries |
| DS-002 | Primary | BEH-002 | phone check | pairing screen or banner | `MobilePairedShell` | revoked/off outcomes |
| DS-003 | Primary | BEH-003 | process death → onCreate | page reopened | `MainActivity` | restore |
| DS-004 | Primary | BEH-005 | Clipboard tap | remote/phone clipboard | `MobileNodeDesktopClipboard` → `useVncSession` | clipboard |
| DS-005 | Primary | BEH-006 | WS upgrade | log line + 4429 | `NodeDesktopViewers.admit` | log |
| DS-006 | Primary | BEH-007 | iframe navigation | load or block | `TrustedNavigationPolicy` | previews |
| DS-007 | Primary | BEH-008 | path entry / launch / restore | registered or refused | `WorkspaceManager.createWorkspace` | clear refusal |
| DS-008 | Local | BEH-017 | render | formatted text | each component with `useLocalization` | app locale |
| DS-009 | Primary | BEH-018 | settings read | address list | `ServerAddressCandidateService` | honest labels |

## Primary Execution Spine(s)

- DS-001: `app.vue isAppReady + mobile session isPaired → useAgentPackageDefinitionChangeFeed(enabled) → AgentPackageDefinitionChangeFeed.retain/release → NodeChangeFeed socket (paired node, access_token)`
- DS-002: `MobilePairedShell.checkStatus → (fetchStatus ‖ historyLoad → runHistoryStore.fetchTree (ApolloError kept as historyReadFailure) → readHistory cause) → remoteAccessReadRefusal(cause) → sessionStore.rejectLocalSessionForAuthFailure() | sessionStore.recordCheckOutcome(outcome) → MobileRemoteAccessShell (pairing) | MobileRunList (connection = phone_access_off)`
- DS-003: `MainActivity.onSaveInstanceState → OpenPageRestore.save(bundle, entry, url)`; `MainActivity.onCreate → OpenPageRestore.read(bundle, savedEntries) (TrustedNavigationPolicy) → NodeConnectionFlow.open(entry, pageUrl) → status check → openPage(entry, pageUrl)`
- DS-004: `bar "Clipboard" → MobileNodeDesktopClipboard (sheet) → useVncSession.sendClipboardText(text) → RFB.clipboardPasteFrom → node desktop`; return: `RFB "clipboard" event → useVncSession.remoteClipboardText → sheet Copy → copyTextToPhone(text) (navigator.clipboard | execCommand | selectable fallback)`
- DS-005: `/ws/node-desktop upgrade → authorize → NodeDesktopViewers.admit → refused: console.info line → route closes 4429`
- DS-006: `WebView subframe navigation → AutoByteusWebView.Client.shouldOverrideUrlLoading(request) → TrustedNavigationPolicy.classify(url, entry, isMainFrame) → AllowInWebView | Block | OpenExternal`
- DS-007: `phone loadByPath | desktop resolveRunWorkspaceChoice(folder) | history restore → workspaceStore.createWorkspace → GraphQL createWorkspace → WorkspaceManager.createWorkspace → (unregistered) assertWorkspaceFolder → registry upsert | WorkspacePathRefusedError → GraphQLError WORKSPACE_PATH_REFUSED {reason} → web readWorkspacePathRefusal → field error / launch error / null (restore)`
- DS-009: `Memory Sync / Remote Collaboration resolvers → ServerAddressCandidateService.listCandidates → classifyInterfaceAddress (ip-address-ranges) → candidates (private/tailnet first, public after, link-local skipped)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Subjects | Owner | Off-spine |
| --- | --- | --- | --- | --- |
| DS-001 | The app shell decides when the definitions feed is wanted: always on desktop/browser windows; on the phone only with a paired session. Pairing binds the node and enables the feed; unpair/rejection disables it (release closes the socket). | feed, session | `app.vue` | — |
| DS-002 | The phone's check reads status and history together. A history refusal is classified once: a rejected credential (401, auth codes, revoked) ends the session; Phone Access off marks the connection "phone access off"; anything else is reachability. | refusal, session, connection | `MobilePairedShell` | diagnostics texts |
| DS-003 | Before Android may kill the process, the activity saves the open node's ID and page URL. On recreation the saved page is reopened through the ordinary open flow if the node is still saved and the policy allows the URL under `/mobile`. | open page | `MainActivity` | `OpenPageRestore` |
| DS-004 | In Control mode, one Clipboard button opens a sheet. Paste sends the text the user pasted to the node desktop's clipboard; Copy puts the desktop's last copied text on the phone, or shows it selectable. | clipboard text | sheet component | copy helper |
| DS-005 | The viewer registry refuses over-limit streams and logs one metadata line saying which limit refused. | admission | `NodeDesktopViewers` | — |
| DS-006 | The policy gains one rule: a `blob:` subframe of the open node's origin loads in place. | navigation | `TrustedNavigationPolicy` | — |
| DS-007 | Registration of a path not yet registered first checks it is an existing absolute directory; otherwise a typed refusal travels to the client, which says why (phone field, desktop launch error) or returns null (restore). | workspace path | `WorkspaceManager` | `workspace-folder-check.ts` |
| DS-009 | Interface addresses are classified with the shared range helpers; public addresses get their own kind after private and tailnet ones; link-local ones are skipped. | address candidate | `ServerAddressCandidateService` | `ip-address-ranges.ts` |

## Spine Actors / Main-Line Nodes

`app.vue`, `MobilePairedShell`, `mobileNodeSessionStore`, `MobileRunList`, `MainActivity`, `NodeConnectionFlow`, `useVncSession`, `MobileNodeDesktopClipboard`, `NodeDesktopViewers`, `TrustedNavigationPolicy`, `WorkspaceManager`, GraphQL `WorkspaceResolver`, `ServerAddressCandidateService`.

## Ownership Map

- `app.vue`: app-wide feed enablement (already owns `isAppReady` and the notifications feed enablement).
- `remoteAccessReadRefusal.ts`: the one classification of phone read refusals.
- `mobileNodeSessionStore`: session and connection facts (`authorizedApiReachable`, new `phoneAccessOff`).
- `MobilePairedShell`: when checks run and what their result does; computes the run list's `connection` state.
- `OpenPageRestore` (Android): saving/reading the open page and validating it; `MainActivity` calls it; `NodeConnectionFlow` opens.
- `useVncSession`: the RFB session, incl. clipboard in/out.
- `MobileNodeDesktopClipboard.vue`: the sheet's UI and copy fallback.
- `NodeDesktopViewers`: admission decision and its log.
- `TrustedNavigationPolicy`: every WebView navigation decision.
- `WorkspaceManager`: registration invariant (unregistered paths must be folders); `workspace-folder-check.ts` owns the filesystem check and error type.
- `ip-address-ranges.ts`: IPv4/IPv6 range facts.

## Thin Entry Facades / Public Wrappers

| Facade | Owner | Why | Must Not Own |
| --- | --- | --- | --- |
| GraphQL `createWorkspace` resolver | `WorkspaceManager` | transport | the folder check (it only maps the typed error to `WORKSPACE_PATH_REFUSED`) |
| `ensureRunHistoryWorkspaceByRootPath` | `findOrRegisterWorkspaceByRootPath` | restore callers want `null` | its own find/create logic (moved) |

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `isTailnetLikeIp`, `isLanIp` in `server-address-candidate-service.ts` | duplicate policy | `ip-address-ranges.ts` helpers + `classifyInterfaceAddress` | |
| `isRemoteAccessAuthFailure` (`utils/remoteAccess/remoteAccessAuthFailure.ts`) | rule replaced | `remoteAccessReadRefusal` in `utils/remoteAccess/remoteAccessReadRefusal.ts` (file renamed) | update its spec |
| `AutoByteusWebView.Client.shouldOverrideUrlLoading(view: WebView, url: String)` | Dead: minSdk 26 (`build.gradle:45`); the framework calls the `WebResourceRequest` overload on API ≥ 24, which is overridden | the request overload | |
| `mobileNodeSessionStore.recordAuthorizedApiReachability` | replaced (its only caller is `MobilePairedShell.checkStatus`) | `recordCheckOutcome` | AR-001 |
| `connected: boolean` prop of `MobileRunList` | replaced by a three-state prop | `connection: 'connected' \| 'unreachable' \| 'phone_access_off'` | update callers/specs |
| B04's `includes('1')` assertion | stale | rule-based assertion | |

## Return Or Event Spine(s)

DS-004 return (remote clipboard → phone) above. DS-002: session cleared → `MobileRemoteAccessShell` shows pairing (existing watch).

## Bounded Local / Internal Spines

N/A — no loop or state machine changes (the feed's reconnect loop is unchanged; it is simply released).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If On Main Line |
| --- | --- | --- | --- | --- | --- |
| `OpenPageRestore` | DS-003 | `MainActivity` | save/read/validate | keeps MainActivity thin; unit-testable | activity grows, untested decision |
| `copyTextToPhone` (inside the sheet component) | DS-004 | sheet | programmatic copy with fallback | WebView/http limits | — |
| `workspace-folder-check.ts` | DS-007 | `WorkspaceManager` | `fs.stat` + typed error | one owner for the refusal reasons | manager grows (363 lines) |
| `workspacePathRefusal.ts` (web util) | DS-007 | phone + desktop | read reason from GraphQL error; localized text | one mapping for two surfaces | two text copies |

## Ownership Boundaries / Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden Bypass | Fix If Thin |
| --- | --- | --- | --- | --- |
| `WorkspaceManager.createWorkspace` | folder check, registry | resolver, `ensureWorkspaceByRootPath` | resolver or web pre-checking the filesystem themselves | — |
| `TrustedNavigationPolicy.classify` | every scheme/origin/path rule | `AutoByteusWebView`, `OpenPageRestore` | blob rule inside `AutoByteusWebView` | — |
| `remoteAccessReadRefusal` | refusal codes | `MobilePairedShell` | status-code checks inline in components | — |
| `useVncSession` | RFB object | `MobileNodeDesktop`, sheet | the sheet touching `rfb` directly | — |

## Dependency Rules

- `server-addressing` → `remote-access/services/ip-address-ranges.ts` (same direction as its existing `url-normalization` import); never the reverse.
- Android `OpenPageRestore` → `TrustedNavigationPolicy`, `SavedNodeEntry`; not → `MainActivity`.
- Web `workspacePathRefusal.ts` ← `useMobileLaunchWorkspaces`, `runWorkspaceChoice`; it must not call the store.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `remoteAccessReadRefusal(cause): 'session_rejected' \| 'phone_access_off' \| null` | a failed phone read | classify | the error | 401, `REMOTE_ACCESS_AUTH_REQUIRED`, `REMOTE_ACCESS_AUTH_INVALID`, `REMOTE_ACCESS_DEVICE_REVOKED` → `session_rejected`; `PHONE_ACCESS_DISABLED` → `phone_access_off`; keep the message-text fallback of today's rule for the same codes |
| `sessionStore.recordCheckOutcome(outcome: 'reachable' \| 'unreachable' \| 'phone_access_off')` | connection | one outcome per check sets `phoneAccessOff` and `authorizedApiReachable` together | — | replaces `recordAuthorizedApiReachability`; session end clears `phoneAccessOff` (AR-001) |
| `TrustedNavigationPolicy.classify(targetUrl, entry, isMainFrame: Boolean)` | navigation | decision | URL + entry + frame | `loadTrusted` passes `true` |
| `OpenPageRestore.save(outState, entryId, url)` / `read(savedState, entries): Restored?` | open page | save/read | entry ID + URL | `Restored(entry, url)`; URL must classify `AllowInWebView` (main frame) and its path start with `/mobile` |
| `NodeConnectionFlow.open(entry, pageUrl = entry.mobileUrl)` | opening a saved node | as today | entry + URL | |
| `useVncSession`: `remoteClipboardText: Readonly<Ref<string \| null>>`, `sendClipboardText(text): boolean` | session clipboard | in/out | — | send only when connected in control mode; cleared on disconnect |
| `NodeDesktopAdmission` refused: `{ refused, limit: 'node' \| 'phone', openStreams }` | admission | result | — | log in `admit` |
| `assertWorkspaceFolder(rawRootPath): Promise<void>` throws `WorkspacePathRefusedError { reason: 'not_absolute' \| 'missing' \| 'not_a_folder' }` | candidate root | check | raw input | checked on the raw trimmed input (before `canonicalizeWorkspaceRootPath` resolves relatives) |
| GraphQL `createWorkspace` error: `extensions.code = 'WORKSPACE_PATH_REFUSED'`, `extensions.reason` | refusal | contract | — | other errors unchanged |
| `readWorkspacePathRefusal(cause): reason \| null`, `workspacePathRefusalText(reason, t)` | web | read/text | — | |
| `findOrRegisterWorkspaceByRootPath(rootPath): Promise<string>` (throws); `ensureRunHistoryWorkspaceByRootPath` = it with `catch → null` | web registration | find-or-create | root path | moved from `ensureRunHistoryWorkspaceByRootPath` |
| `classifyInterfaceAddress(address): 'tailnet_like' \| 'lan' \| 'public' \| null` (null = link-local/unparseable) | interface address | classify | address | private v4 / ULA v6 → `lan` |

## Interface Boundary Check

All rows: responsibility singular `Yes`, identity explicit `Yes`, ambiguity `Low`.

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same Everywhere | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| phone read refusal | `remoteAccessReadRefusal` | Yes | Yes (remote-access vocabulary of the phone) | Low | — |
| open page | `OpenPageRestore` | Yes | Yes | Low | — |
| address kind | `public` | Yes | Yes (next to `lan`, `tailnet_like`) | Low | — |
| refusal code | `WORKSPACE_PATH_REFUSED` | Yes | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| phone sheet UI | `components/mobile/MobileBottomSheet.vue` | Reuse | existing sheet |
| refusal texts on phone | `MobilePairingBootstrap` sentence "`<node>` is reachable, but Phone access is off." | Reuse text | DEC-005 |
| IP ranges | `remote-access/services/ip-address-ranges.ts` | Extend (IPv6 ULA/link-local) | one owner |
| locale | `useLocalization().resolvedLocale` | Reuse | project pattern |
| OS-locale guard | `scripts/guard-localization-boundary.mjs` | Extend | already in every desktop build |
| restart wait | probes' own helpers (`tests/e2e/…`) | Reuse/extend | — |

## Subsystem / Capability-Area Allocation

Web phone shell (D-01, D-02, D-05), Android shell (D-03, D-07), server node-desktop (D-06), server workspaces + web workspace (D-08), web localization (D-17), server addressing + remote-access (D-18), tests/docs (D-10…D-14). All `Extend`.

## Design Decisions Per Item

- **D-01 (item 1).** `app.vue`: `const definitionFeedEnabled = computed(() => isAppReady.value && (!isMobileRemoteAccessRuntime() || mobileNodeSession.isPaired))`; pass it to `useAgentPackageDefinitionChangeFeed`. Nothing else changes (the feed already rebinds on `bindingRevision`; release closes the socket).
- **D-02 (item 2).** New `utils/remoteAccess/remoteAccessReadRefusal.ts` replaces `remoteAccessAuthFailure.ts` (interface above). **The refusal reaches the check as the error object (SR-005, IMP-02):** the node refuses a phone's GraphQL read with HTTP 403 `{error, code, message}`; Apollo 3.14 throws `ApolloError` whose code is only in `networkError.result.code` (status in `networkError.statusCode`); `runHistoryLoadActions.fetchTree` keeps only `error.message` (`:150-152`), and `useRunHistorySectionLoad.readHistory` returns that string as `cause` (`:38`). So: the history store keeps the failed read's thrown error as `historyReadFailure: unknown | null`, set at the same places and from the same error as the message it stores in `error`, and cleared wherever `error` is cleared (one failure, two views: `error` for display, `historyReadFailure` for classification — never set independently). `readHistory` returns `historyReadFailure ?? error` as `cause`. `remoteAccessReadRefusal` reads the status and code from `ApolloError.networkError.statusCode` / `networkError.result.code` and from the axios `response.status` / `response.data.code` shape (today's), and keeps today's message fallback for the 401 and auth codes. No extra request (options B and C of the implementer's report rejected: B adds a read; C is behavior by message text). `MobilePairedShell.checkStatus` records exactly one outcome per check (ARCH-REV-001 AR-001): `session_rejected` → `rejectLocalSessionForAuthFailure()` and return (today's 401 path); otherwise `sessionStore.recordCheckOutcome(outcome)` with `outcome = 'phone_access_off'` for that refusal, else `'reachable'` / `'unreachable'` by today's rule (`read.ok || statusReachable`). `recordCheckOutcome` sets both facts every time: `phoneAccessOff = outcome === 'phone_access_off'`, `authorizedApiReachable = outcome === 'reachable'`; it replaces `recordAuthorizedApiReachability` (its only caller is this shell). So off → unreachable shows "Can’t reach `<node>`.", off → reachable shows Connected. `phoneAccessOff` is also cleared when the session ends (`rejectLocalSessionForAuthFailure`, `deleteLocalSession`). `connection` computed: `phone_access_off` when `sessionStore.phoneAccessOff`, else `connected`/`unreachable` as today's `connected`. `MobileRunList`: prop `connection`; bar label `Connected` / `Not reachable` / `Phone access off`; banner for `unreachable` unchanged; for `phone_access_off`: "`{nodeName}` is reachable, but Phone access is off." + Check (same banner markup). The list body is unchanged. Texts stay literals like the rest of `MobileRunList` (it has no `t()` today).
- **D-03 (item 3).** New `autobyteus-android/.../shell/OpenPageRestore.kt` (`save`, `read`; keys `open_page_entry_id`, `open_page_url`). `MainActivity.onSaveInstanceState`: when `screen == Web` and the open entry is saved (`isPageSaved()`), save its ID and `webView.url`. `onCreate` order: shared text → `OpenPageRestore.read(savedInstanceState, savedNodeStore.loadEntries())` → `flow.open(entry, url)` → last used → start. `NodeConnectionFlow.open(entry, pageUrl = entry.mobileUrl)`. An unsaved (pairing) page is not restored.
- **D-05 (item 5).** `useVncSession`: listen to the RFB `clipboard` event → `remoteClipboardText`; `sendClipboardText(text)` → `rfb.clipboardPasteFrom(text)`. New `components/mobile/views/MobileNodeDesktopClipboard.vue` in `MobileBottomSheet`: Paste textarea + "Send to desktop"; Copy section: read-only selectable text + "Copy" (disabled with hint "Copy something on the desktop first." until text exists); copy tries `navigator.clipboard.writeText` when present, else a temporary textarea + `document.execCommand('copy')`; on failure shows "Long-press the text to copy it." `MobileNodeDesktop.vue`: "Clipboard" bar button in Control mode when connected (next to Keyboard), opens the sheet. Texts through `t('mobile.nodeDesktop.*')` (this view's convention), en + zh-CN.
- **D-06 (item 6).** `NodeDesktopViewers.admit` returns `{ refused, limit, openStreams }` and logs `[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=<node|phone> mode=<view|control> viewer=<kind> open=<n> max=<4|2>`. `admit` needs the mode: pass the stream's mode in the viewer admission call (the route has it).
- **D-07 (item 7).** `TrustedNavigationPolicy.classify(targetUrl, entry, isMainFrame)`: before the http(s) check, `scheme == "blob"` → parse the inner URL (`targetUrl.substring(5)`), compare its scheme/host/port with the entry exactly like the same-origin check; `!isMainFrame && sameOrigin` → `AllowInWebView` ("The node page's own preview frame"); otherwise `Block`. `AutoByteusWebView.Client` passes `request.isForMainFrame`; `loadTrusted` passes `true`; remove the deprecated overload. No change to `ShellBridge` (registered for `entry.origin`, ignores subframes).
- **D-08 (item 8).** Server: new `src/workspaces/workspace-folder-check.ts` (`assertWorkspaceFolder`, `WorkspacePathRefusedError`). `WorkspaceManager.createWorkspace`: after the temp-root branch, when `!activeWorkspaces.has(id) && !(await registry.getRootPathByWorkspaceId(id))`, `await assertWorkspaceFolder(config.rootPath)`. The resolver maps `WorkspacePathRefusedError` to `GraphQLError(message, { extensions: { code: 'WORKSPACE_PATH_REFUSED', reason } })`; other errors as today. Web: `stores/workspace.ts createWorkspace` keeps the GraphQL error as the thrown cause (verify it does; if it re-wraps into a plain `Error`, attach the `graphQLErrors`); `utils/workspace/workspacePathRefusal.ts`; `useMobileLaunchWorkspaces.loadByPath` shows `workspacePathRefusalText` when present (else today's text); `runHistoryLoadActions`: extract `findOrRegisterWorkspaceByRootPath` (throws) from `ensureRunHistoryWorkspaceByRootPath` (now its `catch → null` wrapper); `resolveRunWorkspaceChoice` (folder) calls `findOrRegisterWorkspaceByRootPath` and throws `Error(workspacePathRefusalText(reason))` on a refusal, else today's `workspaceUnavailable`. Texts (en, zh-CN): "Enter a full path, starting with /." (Windows nodes: "Enter a full path, starting with a drive like C:\." — choose by the path's form: a path containing `\` or `X:` uses the drive text), "No folder at this path.", "This path is a file, not a folder."
- **D-10 (item 10).** B04: before closing the drawer, count the member rows that show the "Customized" label; after closing, assert the members line reads that count (`runSettings.chat.customizedMembers` / `members.customizedCount` format) — the rule, not a constant.
- **D-11 (item 11).** In probes that stop/start their backend under `nuxt dev` (grep `tests/e2e` for backend `stop()`/`start()`; NVP-05 at least), after the restart wait until `GET <frontendUrl>/` and `GET <frontendUrl>/rest/health` both answer 200 (bounded, e.g. 60 s, polling 500 ms) before the next `page.goto`; one helper next to the probes' other shared helpers.
- **D-12 (item 12).** Replace the four mentions (data-flow node `S`, owner row, paragraph at :226, `content_rendering.md:79`) with `components/workspace/collaboration/CollaborationMessageReferenceViewer.vue`; re-read the component and correct the descriptions.
- **D-13 (item 13).** Solution Designer-owned content, written by implementation from this text: Case 5 gets a paragraph: "autobyteus-277 (CRR-003 F-01): the design said an Org run opens its first member 'as the desktop's target resolver does'; the desktop opens no member. Lesson: a claim about what another surface does is a claim about code — cite the line." New Case 17 "A Refresh Designed Without Measuring Its Payload (autobyteus-277, ARCH-REV-003 AR-009)": the design re-read collaboration views on the run-list poll; one view is up to 1.2 MB (E-38). Lesson: before a design repeats a read, measure what one read carries and how often it runs; a poll multiplies it (see DESIGN.md best practice 4). Case 5 also gets, from this ticket: "autobyteus-426 (SR-005, IMP-02): the phone's refusal rule was designed on the error shape its own unit spec used (`response.status`, `data.code`), but the node's 403 reaches the check through Apollo as `networkError.result.code`, and the history store keeps only the message. Lesson: trace an error from the server to the code that reads it through the real client library and every store that keeps it, not through the shape a test builds."
- **D-14 (item 14).** (1) assert the current removal message; (2) `lastActivityAt` is a valid field now — drop it from the removed-fields list (keep `lastKnownStatus` if still removed); (3) add `deepseek_harness`, rename "all five" to the count; (4) AR-14: after "updated", wait for the automatic re-check to finish — the row exposes `checkedAt` (`api/graphql/types/agent-runtimes.ts:67`; E-14 corrected in SR-005) — before setting the newer version and checking again, because a check is skipped while the re-check is open (implementation measured the re-check ending ~108 ms after the update: R-01 resolved, not a product bug); label: build the message after the wait fails (`until(…, () => \`… (last: ${JSON.stringify(last)})\`)` or equivalent). Reproduce AR-14 first and measure how long the re-check stays open (R-01).
- **D-16 (item 16).** The Phone Setup strings come from `settings.components.settings.phone.*` in `PhoneWayTab.vue` and `PhonesPanel.vue`; neither knows the node kind, `phoneAccessStore.kind` does (`embedded` / `local_container` / `remote`). Add the remote strings of the approved spec as a parallel key set `settings.components.settings.phone.remote.<same path>` (en from the spec verbatim, typographic `’`; zh-CN translated), and one small owner `utils/phoneAccess/phoneSetupTextKey.ts` holding an explicit constant list `REMOTE_WORDED_PATHS` (the spec's remote strings: status ready/not ready per way, the two notes, the no-address message, the allowed note, the How it works lines): `phoneSetupTextKey(kind, path)` → `remote.<path>` when `kind === 'remote'` and `path` is in the list, else `<path>` — a rule, not a key-existence lookup (ARCH-REV-001 AR-002). A catalog spec asserts that en and zh-CN both define `settings.components.settings.phone.remote.<path>` for every listed path, so a missing translation fails the test instead of silently showing "this computer". Both components call it with `phoneAccessStore.kind` and pass `{ name: phoneAccessStore.nodeName }`. Embedded/Docker keys untouched. The Docker "Publish its port" line and the Company address lines are not in the remote set (the spec leaves them unchanged). Render check: the VPN not-ready line at the narrow panel width.
- **D-19 (item 19).** In `AgentEventMonitor.vue`, take the status `<p>` out of the `v-if="!readOnly"` block into its own `shrink-0` block shown whenever `filePreviewStatus` is set; the composer slots and `CollaboratorAddFailureNotice` stay inside `!readOnly`. Same classes, text, `role`, `aria-live` and test id. **First bring the branch up to `origin/personal` (`933163361c` or later, which has 427's change to this file and the phone navigation path)**; the change is made on 427's version. Spec: status visible with `readOnly` true and false; the phone probe (427's MSP-16 neighbourhood in `mobile-shell-probe.mjs`) gets one read-only step if the phone has a read-only conversation to open.
- **D-17 (item 17).** Every OS-locale call (E-17 list) passes `resolvedLocale.value` (components via `useLocalization()`; utilities call `useLocalization()` at use). `guard-localization-boundary.mjs` gains a rule: a `toLocaleString(` / `toLocaleDateString(` / `toLocaleTimeString(` call with no argument or with `undefined` / `[]` first, and `new Intl.<Format>(` with no argument or `undefined` / `[]` first, is a violation. Add `guard:localization-boundary` to the web test run if it is not in the CI test job (check `.github/workflows`; it runs in every desktop build already). Spec: `SystemInstructionActivityItem` with app locale `zh-CN` renders the capture time as `Intl.DateTimeFormat('zh-CN', same options)` gives, inside the translated sentence.
- **D-18 (item 18).** `ip-address-ranges.ts`: add `isIpv6UniqueLocal` (fc00::/7) and `isIpv6LinkLocal` (fe80::/10); update its header comment (Phone Access and node address lists). `server-address-candidate-service.ts`: `classifyInterfaceAddress` (private v4/ULA v6 → `lan`; 100.64/10 → `tailnet_like`; link-local v4/v6 → skipped; else → `public`); public candidates appended after the loop; label `Public address (<interface>)`; `ServerAddressCandidateKind` gains `public`.

## Draft / Final File Responsibility Mapping

| File | Subsystem | Owner | Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-web/app.vue` | web shell | app | feed enablement | Modify |
| `autobyteus-web/utils/remoteAccess/remoteAccessReadRefusal.ts` (from `remoteAccessAuthFailure.ts`) | phone | rule | refusal classification | Rename/Modify |
| `autobyteus-web/stores/mobileNodeSessionStore.ts` | phone | store | `phoneAccessOff` | Modify |
| `autobyteus-web/components/mobile/MobilePairedShell.vue` | phone | shell | check outcomes, `connection` | Modify |
| `autobyteus-web/stores/runHistoryStore.ts`, `stores/runHistoryLoadActions.ts`, `composables/runHistory/useRunHistorySectionLoad.ts` | run history | store / load | keep the failed read's error object (`historyReadFailure`) with its message; return it as the read's cause | Modify (SR-005) |
| `autobyteus-web/components/mobile/runList/MobileRunList.vue` | phone | list | bar/banner per state | Modify |
| `autobyteus-web/composables/useVncSession.ts` | VNC | session | clipboard in/out | Modify |
| `autobyteus-web/components/mobile/views/MobileNodeDesktopClipboard.vue` | phone | sheet | Paste/Copy | Add |
| `autobyteus-web/components/mobile/views/MobileNodeDesktop.vue` | phone | view | Clipboard button | Modify |
| `autobyteus-web/localization/messages/{en,zh-CN}/…` | localization | catalogs | new keys (clipboard, path refusal) | Modify |
| `autobyteus-android/.../shell/OpenPageRestore.kt` | Android | restore | save/read/validate | Add |
| `autobyteus-android/.../MainActivity.kt` | Android | activity | save/restore calls | Modify |
| `autobyteus-android/.../shell/NodeConnectionFlow.kt` | Android | flow | `open(entry, pageUrl)` | Modify |
| `autobyteus-android/.../web/TrustedNavigationPolicy.kt` | Android | policy | blob subframe rule | Modify |
| `autobyteus-android/.../web/AutoByteusWebView.kt` | Android | WebView | pass frame; remove deprecated override | Modify |
| `autobyteus-server-ts/src/node-desktop/node-desktop-viewers.ts` (+ `api/websocket/node-desktop.ts` for the mode) | server | registry | refusal log | Modify |
| `autobyteus-server-ts/src/workspaces/workspace-folder-check.ts` | server | workspaces | folder check, error | Add |
| `autobyteus-server-ts/src/workspaces/workspace-manager.ts` | server | manager | check unregistered | Modify |
| `autobyteus-server-ts/src/api/graphql/types/workspace.ts` | server | resolver | error mapping | Modify |
| `autobyteus-web/utils/workspace/workspacePathRefusal.ts` | web | util | reason + text | Add |
| `autobyteus-web/stores/runHistoryLoadActions.ts`, `services/workspace/runWorkspaceChoice.ts`, `composables/mobile/useMobileLaunchWorkspaces.ts` (+ `stores/workspace.ts` if it drops the GraphQL error) | web | workspace | surface refusal | Modify |
| `autobyteus-server-ts/src/remote-access/services/ip-address-ranges.ts` | server | ranges | IPv6 helpers | Modify |
| `autobyteus-server-ts/src/server-addressing/server-address-candidate-service.ts`, `server-address-candidate-types.ts` | server | addressing | classification, kind | Modify |
| `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue` | conversation | event monitor | file status on read-only conversations (D-19) | Modify |
| `autobyteus-web/components/settings/phone/PhoneWayTab.vue`, `PhonesPanel.vue`; `utils/phoneAccess/phoneSetupTextKey.ts` (Add); `localization/messages/{en,zh-CN}/settings.ts` | web | Phone Setup | remote wording (D-16) | Modify/Add |
| ~25 web files of E-17; `autobyteus-web/scripts/guard-localization-boundary.mjs` | web | localization | app locale; guard | Modify |
| `autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs`, `node-vocabulary-probe.mjs` (+ helper) | tests | probes | D-10, D-11 | Modify |
| four server E2E test files (E-14) | tests | E2E | D-14 | Modify |
| `autobyteus-web/docs/agent_artifacts.md`, `docs/content_rendering.md`; `docs/design-cases.md` | docs | docs | D-12, D-13 | Modify |

## Reusable Owned Structures Check / Tightness

| Structure | File | Owner | Why Shared | Tight |
| --- | --- | --- | --- | --- |
| IP range helpers | `ip-address-ranges.ts` | remote-access | two consumers | Yes (pure predicates) |
| workspace refusal reason | server error + web reader | workspaces | two web surfaces | Yes (one enum) |

## Target Subsystem / Folder / File Mapping / Folder Boundary Check

As the table above; every file stays in its existing folder; the two new web/Android files sit next to their owners. Risk `Low`.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| item 2 | `switch (remoteAccessReadRefusal(cause))` with explicit cases | adding `|| code === 'REMOTE_ACCESS_DEVICE_REVOKED'` to a boolean "auth failure" and then special-casing Phone Access off in the component | one owner, explicit outcomes (Principle 13) |
| item 7 | `classify("blob:http://10.0.0.2:29695/uuid", entry, isMainFrame = false)` → Allow; `isMainFrame = true` → Block; `blob:http://evil:80/…` → Block | allowing every `blob:` in `AutoByteusWebView` | policy stays the single rule owner |
| item 8 | registered `/old/deleted` → accepted; unregistered `/old/deleted` → `missing` | checking in the resolver only (run provisioning would slip past) | all forms covered |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `isRemoteAccessAuthFailure` beside the new rule | spec callers | Rejected | rename + update spec |
| Keep `isLanIp` for other callers | — | Rejected (no other caller) | shared helpers |
| Item 15 404-means-old fallback | Task item 15 | Rejected (DEC-011, rule 9) | — |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Server: D-18 (ranges + classification, unit tests), D-08 (folder check + resolver + E2E), D-06 (log + spec), D-14 (tests; AR-14 reproduced first).
2. Web: bring the branch up to `origin/personal` before D-19 (427); D-08 client side, D-01, D-02, D-05 (+ specs), D-16 (remote wording + specs, render check), D-17 (sites, guard, spec), D-12, D-13.
3. Android: D-07 (policy + unit tests), D-03 (restore + unit tests), emulator checks.
4. Probes: D-10, D-11; run B04 and NVP-05.

## Review Residual Notes (ARCH-REV-001)

- RR-01: keep AC-007's `window.AutoByteusShell === undefined` check in the emulator run; any future same-origin `blob:` iframe must keep a sandbox without `allow-same-origin` (autobyteus-416 owns the broader preview posture).
- RR-02: after process death a share intent is re-delivered and wins over the restore (preserved, REQ-003); note it in the implementation handoff.
- RR-03: server-internal registrations (`agent-run-provisioning-service.ts:249`, `standalone-agent-run-lifecycle-service.ts:444`, `team-run-service.ts:126`, `agent-org-run-manager.ts:275`, `agent-org-run-service.ts:255`, `configured-agent-execution-handle.ts:451`) now refuse an unregistered missing folder with `WorkspacePathRefusedError` instead of a later `ENOENT`; cover one server-internal form in the server E2E and list the forms in the implementation handoff.

## Key Tradeoffs

- Item 8 checks all unregistered registrations (one invariant, all forms) instead of user entry only; cost: a historical run whose workspace was removed and folder deleted opens without a workspace (DEC-004).
- Item 5 web-only clipboard with a selectable fallback, instead of a native bridge, to avoid widening the bridge and any permission question.
- Item 11 waits in probes instead of patching the dev server whose failure origin is unproven.

## Risks

- R-01 (AR-14 product bug) → Design Impact if the re-check never ends.
- U-01 copy in the WebView — fallback always works; measure on the emulator.
- autobyteus-416 overlap on `TrustedNavigationPolicy` → resolved at merge (Task).

## Guidance For Implementation

- Reproduction to start from: B04 (`node autobyteus-web/tests/e2e/fresh-run-auto-approval-probe.mjs`), NVP-05 (`node autobyteus-web/tests/e2e/node-vocabulary-probe.mjs`), the four server E2E tests (`pnpm vitest run` on the files in E-14, from `autobyteus-server-ts`); each fails on the base (archived evidence).
- Tests on isolated nodes only (TESTING.md); the emulator checks (AC-004, AC-005, AC-007) on an emulator with an isolated node, as 407/415 did.
- No new Android permission: the manifest diff must be empty.
- Write the design-case text of D-13 as given (Solution Designer-owned); ask for a Design Impact if it does not fit the file's form.
