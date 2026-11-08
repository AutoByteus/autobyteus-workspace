# Solution Handoff — phone-node-name-privacy (autobyteus-433)

- Result: `Architecture Design Complete`
- Package identifier: `phone-node-name-privacy`; Project Task `autobyteus-433` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Current solution revision: `SR-006` (after CRR-001 F-001, IR-002, CRR-002 F-002 and delivery DR-001)
- Classification: `task_size = Medium`, `architectural_risk = Low` (rationale: `design-spec.md`, Task Size And Architectural Risk)
- Route: direct implementation (handoff rule: Small/Medium and Low → `/software_engineering_team/implementation_engineer`); SR-002 sent 2026-11-08; SR-003 sent 2026-11-08
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user

## Original Request (condensed)

On the phone's first page the user's nodes show by name ("AutoByteus Desktop", "docker-8001"). Once he opens the desktop node, the page header shows its Tailscale address (machine name plus tailnet name) instead. He shares screenshots publicly and sees this as a privacy leak. His decision (Task comment, 2026-11-08): show no address in the normal phone UI, by default or on purpose (no "Details" action); show the node's name and the connection state only; troubleshooting messages use plain words, for example "Can't reach AutoByteus Desktop. Check that Tailscale or your Wi-Fi is on and the computer is awake". If a real need for the address appears in a support case, ask the user before showing it.

## Goals And Done-When

A normal screenshot of the phone app (first page, connected page, node switcher, connection errors) shows node names and no machine name, tailnet name or address; tests; finalized on the base branch. (The Task's "address still reachable on purpose" was replaced by the user's decision above.)

## Constraints

- No change to pairing, credentials, the Host and Origin rules (autobyteus-403, 416), the bridge's origin/main-frame rule (417); no server change; no new Android permission.
- Tests on the emulator and an isolated node; test names only ("Test Desktop", `test-desktop.example-tailnet.ts.net`); never the user's real machine or tailnet names in code, tests, screenshots or documents.
- Release only on the user's word.

## Cause (Read; the user reproduced it on his phone)

The connected page's header is the node-served `/mobile` page. It shows the session's QR name or, when the session has none, the address's host (`MobilePairedShell.vue:130`). Sessions paired before autobyteus-395 have no name, while the app named its entry "AutoByteus Desktop" from the old status answer. The connection sheet additionally always prints the full address. The app also names typed-address nodes by their host and prints URLs in some toasts and overlays.

## Approval Basis

Requirements `SR-001` approved by the Solution Designer within the direction; the user was informed in the Solution Designer's conversation (2026-11-08). No `Needs user` decision. No design approval required by the direction.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy`
- Branch: `codex/phone-node-name-privacy`
- Base: `origin/personal` at `eebbc2b8eed0e83cd3627298d8a7abec19c7d02f`; finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-node-name-privacy/tickets/in-progress/phone-node-name-privacy/`

## Documents

- `requirements-doc.md` (Approved, SR-001)
- `investigation-notes.md`
- `design-spec.md` (Ready, SR-002): exact texts, file mapping, tests to add, reproduction to start from
- `solution-revision-record.md`
- `follow-ups.md` (FU-001, not urgent)

## Expected Output

Implementation of `design-spec.md` with the listed web and Android unit tests, the probe update and the implementation handoff; API/E2E then validates on the emulator with an isolated node (AC-009), rebuilding both the APK and the `/mobile` bundle the node serves.

## Open Risks

- RISK-001: the fix reaches the user only when both the Android app and the node(s) serving `/mobile` are updated (one release).
- DEC-004: two never-paired typed nodes both read "AutoByteus node".
- DEC-008: the overlay's existing **Browser** action still opens the node in the phone's browser (outside the app).

## SR-003 Revision (CRR-001 F-001)

- Trigger: code reviewer failure-origin review CRR-001 (`code-review-report.md`), from API/E2E round API-REV-001: on a main-frame load failure, WebView's built-in error page with the node URL showed through the 92 % opaque "Can’t reach" overlay (reload, Back, Retry), and its URL was in the accessibility tree. Classified `Design Impact`: DS-004 decided only the overlay's text.
- Decision (DEC-009, DS-004, DS-006):
  - While any overlay is up, the WebView stays in the layout but is `INVISIBLE`, and the overlay is opaque (`WebShellScreen`).
  - `AutoByteusWebView` decides each main-frame load's outcome itself. A main-frame `onReceivedError` or `onReceivedHttpError` marks the load failed, and `onPageStarted` clears the mark. It reports `onPageLoaded()` only from the `onPageFinished` of a load that did not fail. This replaces the `onPageStarted` (dead) and `onPageFinished(url)` callbacks.
  - `MainActivity` records whether an overlay is up. On `onPageLoaded` it shows the page when the first page has not been shown yet, or when an overlay is up on the Web screen; otherwise it does nothing.
  - So a failed first load stays an overlay, and Retry or Back that loads the page closes the overlay. That is FU-002, folded in.
- Premise to confirm on the emulator first, with a temporary log removed before handoff: on a failed main-frame load WebView 124 calls `onPageStarted`, then `onReceivedError`, then `onPageFinished`; on an HTTP error, `onReceivedHttpError` comes before `onPageFinished`. Return a Design Impact if the order differs.
- Classification unchanged: `Medium` / `Low`.
- Rerun expected from API/E2E: API-08, API-08b, API-03, a Retry-after-recovery case, and a first-load failure if reachable.
- Requirements: REQ-006, AC-007 and DEC-009 were clarified within the direction (SR-003); the user was informed.

## SR-004 Revision (IR-002 premise check)

- Trigger: the implementation engineer's premise check (IMP-09, `evidence/IMP-09-sr003-load-order-premise.log`). On WebView 124, an HTTP error on the main frame arrives before `onPageStarted`, while a network error arrives after it.
- Decision (DS-006):
  - A main-frame `onReceivedError` or `onReceivedHttpError` marks the load failed.
  - `onPageFinished` decides `loaded = !failed`, resets the mark, and calls `onPageLoaded()` only when loaded.
  - `onPageStarted` does not touch the mark.
- Rejected: resetting in `onPageStarted`, which erases HTTP errors, and a mark keyed by URL, which breaks on redirects such as `/mobile` → `/mobile/`.
- Accepted residual: a failed load with no `onPageFinished` (not observed) keeps the overlay one Retry longer. It never shows the page.
- Tests: the three measured orders (network failure, HTTP error first, success) and a sub-resource error, as a JVM test of the decision if it is extracted, otherwise instrumented.
- Everything else in SR-003 stands. Classification unchanged: `Medium` / `Low`.

## SR-005 Revision (CRR-002 F-002)

- Trigger: code reviewer CRR-002. After a page had loaded, a failed reload, Retry or Back showed WebView's error page full-screen, with the URL and no Retry. The cause: WebView calls `onPageFinished` twice for that failed load, and SR-004 counted the second call as success (log `evidence/emulator-r2/API-08-cause-onPageFinished-twice.log`). This is the second failed correction, so the approach was re-examined.
- Decision (DEC-010, DS-004, DS-006):
  - WebView load callbacks no longer decide visibility. Remove `MainFrameLoadOutcome` (and its test), `onPageLoaded`, and the `onPageStarted`/`onPageFinished` overrides.
  - Main-frame errors still raise the diagnostic overlay.
  - The node's page reports itself mounted. `MobileRemoteAccessShell` `onMounted` → `getShellBridge()?.pageReady()` → `{type:"pageReady"}` on the existing bridge, under the same origin and main-frame rule → `ShellBridge` → `Actions.onPageReady(entry.id)`.
  - `MainActivity` keeps the open page's overlay as state (`pageOverlay: ConnectionDiagnostic?`, reset in `openPage`/`closePage`). `showPage()` always renders with it, so a return from Switch node keeps it.
  - Only `onPageReady` from the open web host's entry clears the overlay. It shows the page if the first page is not shown yet or the screen is Web; otherwise it does nothing.
  - This fails closed: WebView's error page has no bridge, and a proxy's error body does not run the page's code.
- Measure first (temporary log, removed before handoff), on WebView 124, both over a page that had loaded and on a fresh WebView:
  - No `pageReady` arrives for failed loads (refused, dropped, 502) on first load, reload, Retry and Back.
  - `pageReady` arrives once per document for successful loads.
  - Record whether a Back restored from the back-forward cache re-mounts the shell. If it does not, the overlay stays until Retry, which is acceptable.
  - Return a Design Impact if a failed load ever yields `pageReady`.
- Rule 9 consequence (accepted, user informed): a node still serving an older `/mobile` page never sends `pageReady`, so the new app waits on "Opening your runs…" for it until it is updated. Release notes must say to update every node with the app.
- Tests: design-spec Guidance ("SR-005 tests"). The CRR-002 log's sequences §2, §3, §8 and §4–§7 become cases if the page-state rule is extracted.
- Classification unchanged: `Medium` / `Low`. API/E2E rerun plan: CRR-002's list.

## SR-006 Revision (delivery DR-001: integration with autobyteus-432)

- Trigger: the delivery engineer's base refresh. `origin/personal` is at `b690a5dfdb`, which includes autobyteus-432's desktop full screen (rule D-2). Five conflicts, one semantic in `MainActivity.kt`. The branch is at `492e88e756`; nothing is pushed.
- Decision: DEC-011; design-spec section "SR-006 Integration With autobyteus-432". Each event has one job:
  1. `onPageStarted` stays only to reset full screen and clear the page's full-screen request. It does not decide visibility.
  2. `showPage()` with an overlay is not the plain page: it resets, and no `pageShown()`.
  3. The page's `desktopFullScreen(on)` request is remembered and applied only while the plain page shows. `off` is applied at once.
  4. `pageReady` alone shows the page or clears its overlay (unchanged).
- Merge guidance: the design-spec section, including renumbering this ticket's design case to **Case 19**.
- Validation on the integrated state: this ticket's AC-007 cases and 432's full-screen cases (enter/exit; reset on reload, Switch node and overlay; a page reopened at `full=1`). Delivery re-judges from that evidence (DR-002).
- Open for the user (not blocking implementation):
  - AC-001 user-only check on his own phone. It needs both the app and his nodes updated, so it can only come after a release, and only he can decide to release.
  - RISK-001: the release notes must ask him to update the app and every node together.
- Classification unchanged: `Medium` / `Low`.
