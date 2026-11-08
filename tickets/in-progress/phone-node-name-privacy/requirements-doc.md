# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-005` (requirements baseline `SR-005`; first baseline `SR-001`)
- Package identifier: `phone-node-name-privacy`
- Request / ticket: Project Task `autobyteus-433` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-08
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's conversation messages of 2026-11-08 that sum up these decisions (SR-001; SR-003 after CRR-001 F-001; SR-005 after CRR-002 F-002), and the handoff file `solution-handoff.md`. The user's own decision (no address, no Details action, plain-language messages) is the Task comment of 2026-11-08.
- Exact approved requirements baseline / solution revision: this document at `SR-005` (REQ-006, AC-007, DEC-009 revised at SR-003 after CRR-001 F-001; REQ-006, AC-007, DEC-010 at SR-005 after CRR-002 F-002; everything else as approved at `SR-001`)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: inside a node, the phone's page header shows the node's network address (`<machine>.<tailnet>.ts.net`, which names the user's computer and his tailnet) instead of the node's name; its drop-down sheet prints the full address; and a few other phone surfaces can print an address. Screenshots the user shares publicly leak this.
- Affected actors or systems: the phone user; the Android app; the node-served `/mobile` page.
- Desired outcome: everywhere on the phone, a node is shown by its name and its connection state. No machine name, tailnet name, IP address or node URL appears in the phone's normal UI, by default or on purpose (the user's decision); troubleshooting texts use plain words.
- Observable definition of success: screenshots of the first page, the connected page, the connection sheet, Switch node, Connecting, Can't reach and the in-page error overlays show node names and no address.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-003 | The page header shows the session's QR name, else the address's host | The header shows the app's name for this node (the first page's name); else the session's QR name; else the plain label "AutoByteus node"; never an address | The connection state label and dot; the header opens the sheet | `MobilePairedShell.vue:130` |
| BEH-002 | User | SCN-002 | The connection sheet prints the full base URL under the name | The sheet shows the name and the state only | Check/Retry, diagnostic box, Switch node, Unpair | `MobileConnectionSheet.vue:8` |
| BEH-003 | User | SCN-004 | App rows, Switch node, Connecting, Connected, Can't reach, the ⋮ sheet show the entry's stored name, which is the host for a typed address | A node with no name shows "AutoByteus node"; a named node shows its name | Row order, reachability, current-node mark, remove | `SavedNodeEntry.kt:35`, `NodeRow.kt` |
| BEH-004 | User | SCN-005 | A typed-address node keeps its host as its name after its page pairs | It takes the QR name when its page pairs | A QR-paired entry's naming | `NodeConnectionFlow.onPaired` |
| BEH-005 | User | SCN-004 | A typed address that cannot be used shows "Can't reach <typed text>" | "Can't connect" with the existing plain reason; the typed text is not repeated | The Type an address sheet shows what the user types | `NodeConnectionFlow.connectTyped` |
| BEH-006 | User / System | SCN-006 | Toast "Opening outside AutoByteus: <url>"; overlays "Navigation blocked … <url>", "No installed app can open <url>", load failure with the WebView's error text | The same events say what happened in plain words, naming the node where they name one, with no URL or address | Which links open outside, which are blocked, the overlay's actions | `AutoByteusWebView.kt`, `MainActivity.kt:208` |
| BEH-007 | System | SCN-006 | Diagnostics built from an exception carry its text (an unresolved host's name) | No diagnostic text carries an exception's text or an address | Failure kinds and the Can't reach reasons | `ConnectionDiagnosticMapper.fromException` |
| BEH-008 | User | SCN-003 | The pairing page names a QR without a name by its host | It uses "AutoByteus node" | Pairing itself | `MobilePairingBootstrap.vue:113` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Phone user | Use and screenshot the phone app without exposing his network | No address in the phone UI | Still knows which node is open and whether it answers |
| Android app | Owns the node list and the names it shows | Gives the page the name it shows on its first page | No new permission; bridge rules unchanged |
| `/mobile` page | Owns the header, sheet and banner | Shows the name, never the address | Works in a browser and in an older app |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Work inside an open node (header, offline banner, post-pair "Connected to") | SCN-001, SCN-003 |
| UC-002 | Open the connection sheet from the header | SCN-002 |
| UC-003 | See, switch and remove nodes in the app; connect and fail to connect | SCN-004 |
| UC-004 | Name a node added by typing its address | SCN-005 |
| UC-005 | Errors, blocked links and outside links while a node's page is open | SCN-006 |

### Out Of Scope

- The desktop's Phone Setup page, its QR and QR text, and the Nodes page: they show addresses on the owner's own computer, where he chooses the way to connect, and the QR must carry the address for pairing (pairing is not to change).
- Pairing, credentials, the Host and Origin rules (autobyteus-403, 416), the bridge's origin and main-frame rule (autobyteus-417), the public status answer.
- The native iOS shell (`autobyteus-ios`): not the reported app; a code check found no view that prints an address. The `/mobile` page changes reach iOS too.
- How the desktop names its own node (its computer name, decided in autobyteus-395) and how remote nodes are named on the Nodes page.
- Other personal data a screenshot could show (for example workspace paths on the computer in a run's files): a separate concern.
- Pages the user opens outside the app on purpose (the overlay's **Browser** action opens the node in the phone's browser, whose address bar shows the URL).

### Non-Goals

- No "Details" or "Show address" action anywhere in the phone UI (the user's decision).
- No way to rename a node on the phone.
- No change to the wording of messages that show no address, beyond those listed in REQ-006.

### Preserved Behavior Boundary

- Pairing, Switch node, Unpair, Check/Retry, reachability, removing a node, opening the last used node: unchanged (AC-010).
- Saved entries keep their IDs, addresses and selection; no stored data is rewritten except a typed node's name when its page pairs (REQ-005).

### Prerequisites

None.

| Prerequisite ID | Finding And Evidence | Blocks (REQ / AC IDs) | Sent To (agent) / Task Key | Status |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The open node's page names the node, in this order: the name the Android app shows for it on its first page (when the page runs in the app and the app has a name for it); else the name the page saved when it paired; else "AutoByteus node". It never shows the address or its host. The same name is used in the header, its accessibility label, the offline banner, the post-pair "Connected to …", the connection sheet and "Unpair from …". | BEH-001 | Must | The user's report; "the same name as the first page" | N/A | Task; DEC-002, DEC-003 |
| REQ-002 | The connection sheet shows the node's name and its connection state and no address. | BEH-002 | Must | The user's decision: no address, not even behind Details | N/A | Task comment; DEC-001 |
| REQ-003 | The Android app shows a node with no name as "AutoByteus node" wherever it shows a node's name (first page, Switch node, Connecting, Connected, Can't reach, the ⋮ sheet and its confirmation, accessibility labels). A node has no name when it never had one from a QR or a pairing (a typed address, or a saved entry whose stored name is its own host). | BEH-003 | Must | Typed nodes are named by their host today | N/A | DEC-003, DEC-005 |
| REQ-004 | When a typed address cannot be used, the app says "Can't connect" with its plain reason and does not repeat the typed text. | BEH-005 | Should | The Can't reach screen is a common screenshot | N/A | DEC-006 |
| REQ-005 | When the page of a node with no name pairs, the app saves the node under the page's QR name. | BEH-004 | Should | Gives typed nodes a real name the first time it is known | N/A | DEC-004 |
| REQ-006 | While a node's page is open, the app's toasts and error overlays show no URL or address: an outside link or download says "Opening outside AutoByteus"; a blocked link, a link no app can open, and a page that fails to load say so in plain words; the load failure names the node and says to check Tailscale or Wi-Fi and that the computer is awake. Nothing of the page or of the WebView's own error page shows behind an overlay or reaches the accessibility tree while the overlay is up, and a failed load never replaces the overlay with that error page. The overlay, with its Retry, stays until the node's own page is showing again (after Retry, Back or a reload); then it closes and the page shows. A failed load, also over a page that had loaded, never removes the overlay. | BEH-006 | Must | A download from the node is a node URL; WebView's built-in error page prints the URL (CRR-001 F-001) | N/A | Task comment (plain-language example); DEC-007; DEC-009 |
| REQ-007 | No connection diagnostic the app builds carries an exception's text or an address, whether or not it is shown today. | BEH-007 | Should | The old app showed "Unable to resolve host …"; the text exists and could be shown again | N/A | DEC-007 |
| REQ-008 | The pairing page names a QR without a name "AutoByteus node", not its host. | BEH-008 | Could | Same fallback rule everywhere | N/A | DEC-003 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | In the app, a node saved as "Test Desktop" whose page session has no name (paired before names were kept), at a `*.ts.net` test address | The header shows "Test Desktop" and "Connected"; the header's text and aria label contain no part of the address | Not reachable: "Not reachable" and "Can't reach Test Desktop." | Web unit tests; emulator with an isolated node |
| AC-002 | REQ-002, REQ-001 | BEH-002 / SCN-002 | Open the header's sheet, reachable and not reachable (with its diagnostic) | The sheet shows the name, the state, the actions; its whole text contains no address, host or URL | — | Web unit tests; emulator screenshot |
| AC-003 | REQ-001, REQ-008 | BEH-001, BEH-008 / SCN-003 | No app name (a browser; or the app has no name for the node): session with a QR name; session without one; pairing page for a QR without a name | QR name when the session has one; otherwise "AutoByteus node"; never the host | — | Web unit tests |
| AC-004 | REQ-003 | BEH-003 / SCN-004 | App with a QR-named node, a typed-address node, and a saved entry whose stored name equals its host | Rows, Switch node, Connecting, Connected, Can't reach and the ⋮ sheet show the QR name or "AutoByteus node"; no host appears | — | Android unit tests; emulator screenshots |
| AC-005 | REQ-005 | BEH-004 / SCN-005 | A typed-address node's page pairs with a link whose QR name is "Test Node" | The first page lists the node as "Test Node" | A node that already has a name keeps it | Android unit test (`NodeConnectionFlowTest`) |
| AC-006 | REQ-004 | BEH-005 / SCN-004 | Type an address that cannot be used | The Can't reach screen's title is "Can't connect" and neither title nor body contains the typed text | — | Android unit test |
| AC-007 | REQ-006 | BEH-006 / SCN-006 | A download from the node; a blocked same-origin link; a link no app can open; a main-frame load failure on reload, on system Back into history, on the overlay's Retry, and on the page's first load | The toast and overlays contain no URL, host or address; the load failure reads "Can't reach <name>" with the Tailscale/Wi-Fi/awake advice; the screenshot shows only the overlay (no page or error page behind it) and the uiautomator dump has no host or URL; after the node is back, Retry (or Back to a page that loads) closes the overlay and shows the page | While the node stays down, the overlay and its Retry stay, also when the page had loaded before the failure (reload, Retry, Back; CRR-002 F-002), and also after leaving to Switch node and coming back | Android unit tests of the texts and of the load-outcome rule; emulator screenshots and uiautomator dumps |
| AC-008 | REQ-007 | BEH-007 / SCN-006 | A status check fails with an unknown-host exception naming a test host | The diagnostic's title, message and action do not contain the host or the exception text | — | Android unit test |
| AC-009 | REQ-001…REQ-006 | SCN-001…SCN-006 | Emulator, isolated node, test names only | Screenshots of the first page, the connected page, the sheet, Switch node and a Can't reach screen show names and no address | — | API/E2E on the emulator |
| AC-010 | Preserved | SCN-001, SCN-002, SCN-004 | Existing flows | Pairing, Switch node, Unpair, Check/Retry, reachability, Remove, opening the last node behave as before; existing suites pass | — | Existing web and Android suites; emulator |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Phone user | Work in a node | Tap a node on the first page, or open the app | Node saved in the app | The page opens; the header shows the node and its state | Name as on the first page, no address | Not reachable banner names the node | Supported Normal Scenario | The user's report | REQ-001, AC-001 |
| SCN-002 | User | Phone user | Check the connection | Tap the header | Inside a node | The sheet opens | Name, state, Check, Switch node, Unpair; no address | Diagnostic box when failing | Supported Normal Scenario | `MobileConnectionSheet.vue` | REQ-002, AC-002 |
| SCN-003 | User | Phone user | Use the phone page in a browser (no app); pair from a link | A browser tab on `/mobile`, or a pairing link | — | As SCN-001/002 | Session name or "AutoByteus node" | — | Supported Normal Scenario (the page supports browsers: `MobilePairingBootstrap.vue` "Get the Android app", pairing in a browser) | `MobilePairingBootstrap.vue` | REQ-001, REQ-008, AC-003 |
| SCN-004 | User | Phone user | Choose, connect to, remove nodes | First page, Switch node, Type an address, ⋮ | Saved nodes, some typed | Connect; fail to connect | Names or "AutoByteus node" | Can't reach / Can't connect | Supported Normal Scenario | `StartScreen.kt`, `MainActivity.kt` | REQ-003, REQ-004, AC-004, AC-006 |
| SCN-005 | User | Phone user | Pair a node added by typing | Type an address, then paste a pairing link on its page | Typed node saved, unpaired | Page pairs | Node takes the QR name | — | Supported Explicit Edge Scenario (README: typed address "offers its own pairing") | `autobyteus-android/README.md` | REQ-005, AC-005 |
| SCN-006 | User / System | Phone user, WebView | Follow links, download, survive failures | Links, downloads, network loss | Page open | Toast or overlay appears | Plain words, no URL | Retry, Edit, Browser actions stay | Supported Normal Scenario | `AutoByteusWebView.kt` | REQ-006, REQ-007, AC-007, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (texts and one removed line; no new layout)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: the sheet's header keeps the name as its title and loses the monospace address line; everything else keeps its layout.
- Explicitly illustrative fixture content: test names ("Test Desktop", "Test Node") in tests and screenshots.
- Required screens, states: header (connected, not reachable, Phone access off), sheet (both states), first page, Switch node, Connecting, Connected, Can't reach, Can't connect, the in-page overlay.
- Product decisions that need the user: none (the user decided the address question; the remaining wording follows his example).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001…REQ-007; AC-009 | Privacy | 0 occurrences of the test node's host, tailnet name or URL in the visible text of the listed screens | Emulator, isolated node at a test `*.ts.net`-style or test LAN address | Screenshot review and text assertions |
| QR-003 | REQ-001 | Security | The bridge's origin and main-frame rule is unchanged; the reply carries no credential | Bridge | Existing `ShellBridgeMessagesTest` passes; review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`, narrowly: a saved node with no name gets the QR name when its page pairs (an existing write).
- Data or state that must be preserved: every saved entry (ID, address, selection), the page's session and credential.
- Loss, reset, rebuild acceptable: none.
- Constraints: none beyond the above.
- Unknowns: none. Existing entries whose stored name is their host are shown with the plain label without rewriting them.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Bridge `hello` reply (app ↔ page) | Gains the app's name for the open node; the app and the page come from one release (`DESIGN.md` rule 9: no mixed-version design) | `shellBridge.ts`, `ShellBridge.kt` | Low |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's header shows the address because his page session was paired before names were kept (autobyteus-395) | Explains why the app has a name and the page does not | Code history (Read); AC-001 reproduces the state with a test session | Supported by evidence |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Keep the address behind a Details action? | The Task's first lead | The user's comment | No address anywhere in the normal phone UI, not even on purpose; the sheet loses its address line | User (Task comment, 2026-11-08) | Decided |
| DEC-002 | Where does the page get the node's name? | The app knows "AutoByteus Desktop"; the page's old session does not | (a) The app passes its name for the open node in its existing `hello` reply; (b) a server change so the status answer names the node; (c) the page only uses its own session name | (a): the user asked for "the same name as the first page", which only the app knows; it needs no server change and no change to pairing; the bridge already answers only the open node's own page. (b) would publish a name on an unauthenticated answer. (c) still leaves pre-395 sessions nameless. Order: app name, then session name, then the plain label | Solution Designer | Decided |
| DEC-003 | What shows when no name is known? | Some name must show | The host (today); "AutoByteus node"; "Your computer"; empty | "AutoByteus node": the product's word for what the phone connects to, true for Docker and remote nodes too (where "computer" would mislead), and reads well in "Connecting to …" and "Can't reach …" | Solution Designer | Decided |
| DEC-004 | Two unnamed nodes look alike | List clarity | Number them; ask for a name; accept | Accept: only a typed address that never paired is unnamed, it is reached through "Other ways to connect", and pairing names it (REQ-005). Adding naming UI is out of proportion | Solution Designer | Decided |
| DEC-005 | Rewrite saved entries whose name is their host? | Existing data | Migrate; apply the rule on display | Apply on display: nothing stored changes, and a later pairing names the node. A migration would add risk for no visible gain | Solution Designer | Decided |
| DEC-006 | What does Can't reach say for a typed address that cannot be used? | Screenshots of errors | Echo the text; "Can't connect" | "Can't connect" (the title the screen already uses for an unreadable QR) with the existing reason "Check the address and try again."; the typed text is still in the sheet the user returns to | Solution Designer | Decided |
| DEC-007 | Texts of toasts and overlays | Plain words, no URL | Keep URLs; drop them | Drop them. Load failure: "Can't reach <name>" + "Check that Tailscale or your Wi-Fi is on and the computer is awake." (the user's example). Toast: "Opening outside AutoByteus". Exact wording of the rest in the design spec | Solution Designer | Decided |
| DEC-010 | How does the app know the node's page, not WebView's error page, is showing? (CRR-002 F-002; second failed correction of the same behavior, re-examined) | Rules over WebView's load callbacks failed open twice: the callback order and count differ by error kind and by whether a page had loaded (two `onPageFinished` for a failed load over a loaded page) | (a) a third callback rule (navigation generation; the callbacks carry no navigation ID); (b) a positive "ready" signal from the node's page over the existing bridge | (b): it fails closed by construction (WebView's error page has no bridge and a proxy's error body does not run the page's code), it is one small message on a channel that already exists, and it ends the tuning. Consequence under `DESIGN.md` rule 9: an older node page never sends it, so the new app waits on "Opening your runs…" for a node that was not updated; the release notes say to update every node with the app; the user is told. The requirement itself is achievable and unchanged | Solution Designer | Decided |
| DEC-009 | What does the WebView show behind an overlay, and when does the overlay close? (CRR-001 F-001, C-002, C-003; FU-002) | WebView's built-in error page prints the node URL; a translucent overlay shows it; screen readers reach it; the first-load path replaces the overlay with it | (a) Load a blank or app page on error: changes history, Back and what Retry reloads; (b) opaque overlay only: the URL stays in the accessibility tree; (c) hide the WebView while any overlay is up, show it again only after a load that succeeded | (c): hides it from screenshots and screen readers, keeps history, Back and Retry as they are, and covers every overlay (C-003) with one rule. Because the page is then hidden, the overlay must close when the page loads again, so FU-002 (overlay stuck after a successful Retry) is part of this ticket | Solution Designer | Decided |
| DEC-008 | The overlay's **Browser** action opens the node in the phone's browser, which shows the URL | It is an on-purpose route to the address | Keep; remove | Keep: it opens another app (the browser), not the phone app's UI; it is an existing recovery action; removing it is a separate product change. Mentioned to the user | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001 | AC-001, AC-002, AC-003, AC-009 | SCN-001, SCN-002, SCN-003 | — |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-009 | SCN-002 | — |
| REQ-003 | UC-003 | BEH-003 | AC-004, AC-009 | SCN-004 | — |
| REQ-004 | UC-003 | BEH-005 | AC-006 | SCN-004 | — |
| REQ-005 | UC-004 | BEH-004 | AC-005 | SCN-005 | — |
| REQ-006 | UC-005 | BEH-006 | AC-007, AC-009 | SCN-006 | — |
| REQ-007 | UC-005 | BEH-007 | AC-008 | SCN-006 | — |
| REQ-008 | UC-001 | BEH-008 | AC-003 | SCN-003 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-006.
- Constraints: pairing, credentials, Host/Origin rules, the bridge's origin/main-frame rule, entry IDs unchanged; no permission; no mixed-version design (`DESIGN.md` rule 9).
- Decisions deferred to architecture: where the page's single `hello` answer lives; the owner of the "shown name" rule in the app; the diagnostic function signatures.
- Technical facts to verify: every Android caller of the URL-bearing diagnostics; every place that reads `displayName`.
- Known risks: RISK-001, RISK-002 in the investigation notes.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
