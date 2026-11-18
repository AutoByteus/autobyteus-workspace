# Docs Sync Report — phone-node-name-privacy (autobyteus-433)

## Scope

- Ticket: `phone-node-name-privacy` (Project Task `autobyteus-433`); `Medium` / `Low`, direct route
- Trigger: API/E2E `Pass` round 4 on the integrated state (API-REV-004, `67324d1d9e`), after DR-001 and SR-006 / DEC-011
- Bootstrap base reference: `origin/personal` `eebbc2b8ee`
- Integrated base reference used for docs sync: `origin/personal` `b690a5dfdb`, merged into the ticket branch by `e8516bce5c`. A fetch at the start of DR-002 showed `origin/personal` still at `b690a5dfdb`.
- Post-integration verification reference: API/E2E round 4 on the merge (`api-e2e-execution-coverage-report.md`, round 4; `evidence/emulator-r4/`, `evidence/API-02-r4-*`)

## Why Docs Were Updated

- Summary: the phone now shows a node only by its name. The bridge's `hello` carries the open node's name, and a new `pageReady` message is the only thing that shows the page or closes its overlay. Failed loads stay under an opaque overlay with no URL. The connection sheet lost its address line. Unnamed nodes read "AutoByteus node". Merging with autobyteus-432 changed when desktop full screen applies. The docs still described the sheet with a URL, the bridge without `pageReady` or the name, and full screen reset on page start only.
- Why this should live in long-lived project docs: these are lasting product rules (no address in the phone UI) and a contract between the app and the page (`hello.nodeName`, `pageReady`). Future phone work must keep them, and the release rule depends on them: update the app and the node together.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | Describes what the app owns: names, bridge, web host, full screen | `Updated` | — |
| `docs/android_mobile_access.md` | The phone's user-facing behavior and node list | `Updated` | — |
| `autobyteus-web/docs/remote_access.md` | The `/mobile` screens, the connection sheet, the shell bridge | `Updated` | — |
| `DESIGN.md` | Project rules: rule 9 (one release, no mixed-version design), 10, 11 | `No change` | The ticket follows the existing rules and adds none. Its design lesson is `docs/design-cases.md` Case 19 (written by the Solution Designer/implementation, renumbered after 432's Case 18) |
| `docs/design-cases.md` | Design cases | `No change` (by delivery) | Case 19 is present and correctly numbered after the merge |
| `TESTING.md` | Testing guideline | `No change` (by delivery) | API/E2E added an "Android emulators" section in `82e4807f11` (its own AVD and port, headless, no `uiautomator dump` in landscape). It matches what round 4 ran |
| `RELEASE.md` | Release guide | `No change` | The "Beta notes with a user action" rule already covers this ticket's user action. No discrepancy recorded |
| `autobyteus-ios` docs | The `/mobile` page changes reach iOS | `No change` | iOS has no bridge `pageReady`/`hello` consumer that changes. Out of scope per the requirements |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-android/README.md` | New bullets, edited bullets | <ul><li>New bullet: names shown and never addresses (`SavedNodeEntry.shownName`, "AutoByteus node", typed node named at pairing, "Can't connect", diagnostics without exception text).</li><li>Bridge bullet: `hello` returns the open node's name, plus the new `pageReady`.</li><li>New bullet: when the open page shows (`OpenPageState`, `pageReady` only; invisible WebView under an opaque overlay; the overlay survives Switch node; toasts without URLs; an older node page means "Connecting to …").</li><li>Full-screen bullet: the merged rule (`DesktopFullScreenRequest`: applied only on the plain page; cleared on a new document or when the page closes; another screen or an overlay turns it off and keeps the request).</li></ul> | REQ-001…REQ-007, DEC-010, DEC-011 |
| `docs/android_mobile_access.md` | New paragraph | Names instead of addresses, the name order, "AutoByteus node", "Can't connect", the opaque "Can't reach <node>" overlay until the page reports ready, "Opening outside AutoByteus", the **Browser** exception (DEC-008), and updating the app and the node together | User-facing summary of the ticket |
| `autobyteus-web/docs/remote_access.md` | Edited sheet line; bridge paragraph extended; new paragraph | <ul><li>The sheet shows the name and no address.</li><li>The bridge paragraph adds `hello.nodeName` and `pageReady`.</li><li>New paragraph: the name order (`nodeName.ts`) and the pairing page fallback.</li></ul> | REQ-001, REQ-002, REQ-008, DEC-010 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| No address in the phone UI | Every phone surface names the node. "AutoByteus node" is the fallback. The **Browser** action is the one on-purpose route to the address | requirements-doc DEC-001, DEC-003, DEC-008 | `docs/android_mobile_access.md`, `autobyteus-android/README.md` |
| `pageReady` as the page-visibility signal | WebView load callbacks don't decide visibility. Only the page's `pageReady` shows it, which fails closed on WebView's error page | design-spec DS-006, DEC-010; design case 19 | `autobyteus-android/README.md`, `autobyteus-web/docs/remote_access.md` |
| Desktop full screen merged rule | The request is applied only on the plain page. `onPageStarted` is kept only to clear it | design-spec SR-006, DEC-011 | `autobyteus-android/README.md` |
| App and node in one release | An older `/mobile` page never sends `pageReady` | DEC-010, RISK-001, API-12 | `autobyteus-android/README.md`, `docs/android_mobile_access.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The connection sheet's URL line | Name and state only | `autobyteus-web/docs/remote_access.md` (Connection sheet) |
| The header falling back to the address's host | App name, then session name, then "AutoByteus node" | `autobyteus-web/docs/remote_access.md` (Android shell bridge) |
| Showing the page on the first `onPageFinished`; `MainFrameLoadOutcome` (SR-004, never released) | `pageReady` over the bridge; `OpenPageState` | `autobyteus-android/README.md` |
| 432's "reset on every page start and on any other screen" (D-2) | `DesktopFullScreenRequest` (DEC-011) | `autobyteus-android/README.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, archive the ticket, finalize into `personal` (no release)
- Notes: none
