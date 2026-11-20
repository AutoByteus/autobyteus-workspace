# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `ios-demo-mode-279`
- Request / ticket: autobyteus-279 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (an iOS demo mode for Apple's App Review)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), with the founder's own words in this conversation
- Requirements owner: Solution Designer
- Date: 2026-11-19
- Approved by and reference: `User` — the founder, in this conversation:
  - direction: "So based on the email we can just provide a demo right then yeah try demo we don't need a test node" (2026-11-18);
  - decisions D1–D6 delegated under his rule (2026-11-19): "… a demo is a should be very much similar to how your real application works right or 100% like how your real application works … of course you don't want to how to Android works …";
  - the screens and the readiness (2026-11-19): "I trust you … if you think it passed your verification then we're ready then I think you're ready to continue with your work".
- Exact approved requirements baseline: this document at SR-001
- Behavior-defining supplements:
  - The Product team's approved UI/UX specification: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/ios-demo-mode-279/ui-ux-spec.md` (status Approved, with the founder's words).
    - Visual references: `…/visual-references/VIS-001…VIS-037`.
    - App Review notes draft and demo QR assets: `…/app-review/`.
    - Approved and verified UI reference: `78b51f73`. Integration into the design repository's `personal`: `5d46595a` (no UI change after `78b51f73`).
    - Source pins: `autobyteus-web` `f7b4d68711`; iOS and Android read at `4702c502fe`.
  - My verification: `evidence/demo-verification/verdict.md` (rounds 1–7).

## Problem And Desired Outcome

- Problem: Apple rejected the iOS app (1.3.82 (42), 2026-07-02) under Guideline 2.1(a) "Information Needed": the reviewer cannot use the app (it needs the user's own computer, Tailscale and a pairing QR). Apple accepts "a demonstration mode that exhibits the app's full features and functionality" (not a video) and asks for "a demo QR code" (`evidence/apple-review/`).
- Desired outcome: the iOS app has a built-in demo: the real phone screens on a sample world inside the app, opened by "Try demo" or by scanning a demo QR code, with every feature responding and nothing sent anywhere; plus the scan-first first screen, the iPad layout and the share extension as the approved specification describes, the same as Android where iOS allows.
- Observable definition of success: the built iOS app, on iPhone and iPad from a fresh install, passes the Solution Designer's App Reviewer sweep (the same sweep as `verdict.md`, on the build) and the five engineering conditions (REQ-012); then, on the founder's word, a TestFlight build and a resubmission.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current (evidence) | Desired |
| --- | --- | --- | --- |
| BEH-001 | User | The iOS first screen is a developer form: URL box, cleartext switch, Tailscale/Settings buttons (`autobyteus-ios/AutoByteusMobile/ConnectionViewController.swift`) | The scan-first start screen of Android (UIS-001), with Try demo under Scan in both states |
| BEH-002 | User | No demo; the app needs a computer | A built-in demo (UIS-003…UIS-014) |
| BEH-003 | User | Scanning only reads pairing codes | The demo code `autobyteus://demo` shows "Demo code found" and opens the demo; the Camera app opens it too (the `autobyteus` scheme is registered, `Info.plist:28-31`) |
| BEH-004 | User | The share extension stores the text and says "Saved for AutoByteus. Open AutoByteus to review and connect…" (`ShareViewController.swift:82`); the old form shows it | The extension's sheet (UIS-016) and, when the app opens, Android's handling: a pairing link connects, the demo link opens the demo, other text opens Type an address pre-filled; used once |
| BEH-005 | User | On iPad the phone layout stretches | iPad: centered 448 px first screen; sheets as 512 px cards from 768 px; two panes (380 px list) from 1024 px (UIS-015); also for real use |
| BEH-006 | User | Real app: after your own send the view may stay where it was (`verdict.md` V-04) | The view follows your own send and the reply (DC-007), on phone and desktop |
| BEH-007 | User | Phone Artifacts viewer offers Edit Mode | Phone Artifacts read only, no Edit Mode / Preview switch (DC-011); the desktop unchanged |
| BEH-008 | System | Icons are fetched at run time from `api.iconify.design` (round 4 A-04) | Every icon and asset bundled in the app; no network request in the demo |
| BEH-009 | User | Android | Unchanged (no Try demo, D5) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenarios |
| --- | --- | --- |
| UC-001 | Open the demo from Try demo or the demo QR / link | UXJ-001, UXJ-001b |
| UC-002 | Use every phone feature in the demo with sample data, and leave | UXJ-002…UXJ-009, UXJ-012 |
| UC-003 | Use the iOS first screen to connect a real computer (scan-first, as Android) | UIS-001, UIS-002 |
| UC-004 | Share a link or text to AutoByteus (as Android) | UXJ-011 |
| UC-005 | Use the app on iPad, portrait and landscape | UXJ-010 |

### Out Of Scope

- Android "Try demo"; "Share to a run"; pairing a real computer inside the demo, Switch node and Unpair in the demo.
- The real-app follow-up: a top-level row learns its background tasks only after the run is opened.
- Any App Store submission, TestFlight upload or App Store Connect change without the founder's explicit word.
- The node (server): no server change is expected for the demo (it runs without a node).

### Non-Goals

- A demo on the desktop or the web; a hosted demo node.

### Preserved Behavior Boundary

- The real `/mobile` phone experience (as shipped at `f7b4d68711` and later) when connected to a computer: unchanged except DC-007, DC-011 and the iPad layout (BEH-005…BEH-007).
- Existing saved computers on iOS keep working after the update (their saved entries are read as today).
- The Android app unchanged.

### Prerequisites

None known (to be confirmed by the architecture investigation).

### Review Authority

- Every blocking finding cites a REQ, AC or preserved-behavior ID.
- New product behavior, policy or contract is a `Requirement Gap` (the founder decides).

## Requirements

| ID | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | The iOS first screen is the scan-first start screen of the approved specification (UIS-001, VIS-001/002/030/032): Scan, Try demo under it in both states, Other ways to connect (Type an address, Paste a link), the connecting / connected / can't-reach states, the same as Android. | BEH-001 | D1, D4 |
| REQ-002 | Try demo opens the demo's run list at once (TR-001). Scanning the demo code shows "Demo code found" and opens the demo (TR-002). Opening `autobyteus://demo` from outside the app (the Camera app) opens the demo. Any other code or link keeps its existing path. | BEH-003 | Apple item 2 |
| REQ-003 | The demo is the real phone screens (the same `/mobile` code) on a sample world inside the app: no node address, no credential, no network request, no change on any computer. It cannot be used to reach a real node. | BEH-002 | D2 |
| REQ-004 | The demo's sample world covers at least the specification's coverage (Implementation Fidelity Boundary): agents, Teams with members, an Org, delegated work; running, idle and stopped runs, and an idle run with background tasks; Files and Artifacts with real-looking content and a picture; Messages; Activity on every run; models named as samples on every runtime. | BEH-002 | spec |
| REQ-005 | In the demo every action responds as specified, with scripted results: send (a tool call, a streamed answer ending with the exact closing line), Stop, a member's reply, New run and its reply, attaching a file (the reply names it), Settings change and Save, VNC View only and Control, Text size. Never: an error block, a failed tool, "not available", "Not reachable", placeholder words, or a console error. | BEH-002 | spec; verdict rounds 1–7 |
| REQ-006 | The demo says what it is: the node button "Demo / Sample data" with the sparkles mark, the welcome card on each entry (closable), and the demo sheet with Leave demo (exact copy as specified). Leave demo returns to the first screen and forgets every change; a cold launch also starts on the first screen; the demo is never saved as a computer. | BEH-002 | spec UXJ-012 |
| REQ-007 | The share extension shows the specified sheet and messages (pairing link / demo link / other text / nothing usable) and keeps the text for the app. When the app next becomes active it acts on the kept text once, as Android's `NodeConnectionFlow.connect`: a pairing link connects, the demo link opens the demo, other text opens Type an address pre-filled; a share arriving while the demo is open leaves the demo. | BEH-004 | D6 |
| REQ-008 | On iPad the layout follows the specification's breakpoints: < 768 px phone layout; 768–1023 px phone layout, centered 448 px first screen, sheets as centered 512 px cards; ≥ 1024 px two panes (380 px list, the right area opens runs, views and New run, "Choose a run" when none is open, no ← on the run screen); rotating keeps the open run. This applies to real use as well as the demo. | BEH-005 | D3 |
| REQ-009 | After your own send the view moves to your message and follows the reply (DC-007), in the real app too (phone and desktop share the conversation feed). | BEH-006 | spec |
| REQ-010 | On the phone, Artifacts are read only: no Edit Mode / Preview switch (DC-011). The desktop unchanged. | BEH-007 | spec |
| REQ-011 | Every icon and asset the phone screens use is part of the app bundle; the app makes no request to a third party for them. | BEH-008 | verdict A-04 |
| REQ-012 | Engineering acceptance conditions (verdict Round 6), each verified on the built app: (1) every icon and asset bundled, and no network request while the demo is open, in airplane mode; (2) no console errors on the demo paths (VNC Control, Model sheets included); (3) the real camera scan of the demo QR and the Camera-app link `autobyteus://demo` open the demo; (4) no crash on a fresh install, on iPhone and iPad; (5) the review notes work as written. | all | verdict Round 6 |
| REQ-013 | The real app connected to a computer keeps its behavior (Preserved Behavior Boundary); existing saved computers keep working after the update. | preserved | — |
| REQ-014 | Nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word. | — | Task |

## Acceptance Criteria

| AC ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, 013 | On an iOS simulator (iPhone 17 Pro Max, iPad Air 11-inch) the first screen matches VIS-001/002/030/032; pairing a real test node by QR, Paste a link and Type an address works as before, and a previously saved computer still opens | Simulator UI tests on an isolated node; Android unchanged (its suites) |
| AC-002 | REQ-002 | Try demo, a scan of the demo QR (camera on a device; an injected frame on the simulator) and `xcrun simctl openurl … autobyteus://demo` each open the demo run list with the welcome card | Simulator UI tests; one device check of the real camera |
| AC-003 | REQ-003, 011, 012(1) | With networking disabled (airplane mode on a device; on the simulator a network-blocking check), the whole demo sweep shows every icon and makes no request outside the app | Sweep with request recording; device check |
| AC-004 | REQ-004, 005, 012(2) | The Solution Designer's sweep (`crawl.mjs`, `sheets.mjs`, `final.mjs`, `upload.mjs`, `share.mjs` adapted to the build) reports 0 findings and 0 console errors on iPhone and iPad sizes | The sweep on the build's web content, and native checks |
| AC-005 | REQ-006 | Leave demo returns to the first screen and forgets changes; a cold launch starts on the first screen; no saved computer named "Demo" | UI tests |
| AC-006 | REQ-007 | The four share cases show their messages; the app then connects / opens the demo / opens Type an address pre-filled, once | Simulator UI tests with the share extension; unit tests of the handling |
| AC-007 | REQ-008 | On iPad portrait and landscape the screens match VIS-030…VIS-037; rotation keeps the open run; the same layout with a real node | Simulator and browser checks |
| AC-008 | REQ-009, 010 | Phone and desktop: a send while scrolled up moves to the message and follows the reply; phone Artifacts has no Edit Mode | Web unit and probe tests |
| AC-009 | REQ-012(4) | Fresh install on iPhone and iPad simulators, then (on the founder's word) TestFlight on a real iPhone: no crash through the review notes' steps | UI tests; device run |
| AC-010 | REQ-012(5) | Every step of the review notes works as written on the build | Walkthrough on the build |
| AC-011 | REQ-013 | The existing phone probe (`test:e2e:mobile-shell`) and iOS/Android test suites pass | Existing suites |

## Relevant Scenarios And Journeys

The approved specification's UXJ-001…UXJ-012 (`ui-ux-spec.md`, Journey Details), all `Supported Normal Scenario`; actor: Apple's App Reviewer, or anyone without a computer at hand; evidence: Apple's message and the founder's direction.

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: `ui-ux-spec.md` and `visual-references/VIS-001…VIS-037` (design repository `/Users/normy/autobyteus_org/autobyteus-web-design`, ticket `ios-demo-mode-279`)
- UI/UX user-confirmation reference: the founder's words above (2026-11-19)
- Normative details: every label, placement and breakpoint in the specification's Implementation Fidelity Boundary; illustrative: names, titles, times, counts, file and conversation contents (engineering writes its own sample world).

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-003 | Security / Privacy | The demo holds no credential and opens no connection; it cannot be used as a path into a real node |
| QR-002 | REQ-012 | Reliability | No crash or console error on the demo paths; App Review is strict on "obvious technical problems" |
| QR-003 | REQ-003 | Compatibility | The demo content works with every release (part of the build and its tests), not a separate site |

## Data Continuity And Acceptable Loss

- Persisted data affected: iOS saved computers (unchanged format, read as today); the share extension's kept text in the app group (consumed once). The demo persists nothing (reset on Leave and on cold launch).

## External Contracts And Dependencies

| Contract | Constraint | Authority |
| --- | --- | --- |
| Apple App Review Guidelines 2.1(a), 4.2; Apple's message of 2026-07-02 | full-featured demo mode, demo QR, no placeholders, no crash; more than a repackaged website | `evidence/apple-review/`, the guideline text |
| iOS: a share extension cannot open its containing app | the app acts on kept text when it becomes active | the specification (D6) |

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | D1–D6 | As in the specification (scan-first; built in; iPad two panes; Try demo always; no Android demo; share extension as Android) | Solution Designer under the founder's delegation | Decided |
| DEC-002 | Demo inside the app vs a hosted node | Inside the app: no server, offline, cannot drift, no security exposure | Founder ("we don't need a test node") | Decided |

## Architecture Phase Input

- The mechanism for running the real `/mobile` screens on an in-app sample world, offline, is the main architecture decision: the phone screens reach a node through one Apollo client (`autobyteus-web/utils/apolloClient.ts`), WebSocket clients (`services/agentStreaming/transport/WebSocketClient.ts`, `agentOrgStreamingService.ts`, `agentRunCollaborationStreamingService.ts`, `runStatusFeed.ts`, `nodeChangeFeed.ts`, `FileExplorerStreamingService.ts`, `useTerminalSession.ts`, `useVncSession.ts`), REST `fetch` callers and file URLs; today the iOS app loads `/mobile` from the node.
- The native parts: a UIKit port of Android's start screen (`autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/{start,connect,sheets}`), the scanner's demo code, the URL scheme, the share extension and its app-group handoff.
- The design reference's mock boundary (`autobyteus-web-design`, `mock-boundaries.md`, `plugins/00.prototype-state.client.ts`) is evidence of coverage, not prescriptive.

## Readiness Check

- Content ready for approval: `Yes`; approved basis ready for design: `Yes` (the founder's words above; the Product package's final integration reference to be added on handover).
