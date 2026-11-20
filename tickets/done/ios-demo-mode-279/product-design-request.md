# Product Design Request — autobyteus-279: an iOS demo mode for Apple's App Review

- Classification: `Product Design Requested`, purpose `New Request`
- From: Solution Designer (software engineering team `software_engineering_team_90d2d82493b440c8807db86dfe28c6b8`), 2026-11-18
- Task: autobyteus-279 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (owned by the software engineering team; this design work is part of it)
- Engineering ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279`, branch `codex/ios-demo-mode-279`, base `origin/personal` `4702c502fe`)

## The founder's request, in his words

- 2026-11-18 (read by the PM): "So we need to build an Apple demo mode ... to enable the demo mode for the Apple application."
- 2026-11-18, to the Solution Designer, after reading Apple's message: "So based on the email we can just provide a demo right then yeah try demo we don't need a test node … dedicated task to the product team".
- His routing for phone work: the Solution Designer analyses, the Product team designs the screens, **the founder approves the screens**, then engineering builds with tests.

## Apple's message (App Store Connect, 2026-07-02; screenshots in `evidence/apple-review/`)

Review of iOS app 1.3.82 (42) on an **iPhone 17 Pro Max and an iPad Air 11-inch (M3)**; rejected under Guideline 2.1(a) "Information Needed", two items:

1. "We are unable to successfully access all or part of the app. In order to continue the review, we need to have a way to verify all app features and functionality for all account types. Typically this is done by providing a demo account that has access to all features and functionality in the app. Additionally, make sure the demo accounts you provide include pre-populated content … To resolve this issue, provide a user name and password … **It is also acceptable to include a demonstration mode that exhibits the app's full features and functionality. Note that providing a demo video showing the app in use is not sufficient to continue the review.**"
2. "**We need a demo QR code** or AR marker (image) to fully assess the app features." (to go in the App Review Information notes)

Apple's guideline 2.1(a): a built-in demo mode may replace a demo account "with prior approval by Apple. Ensure the demo mode exhibits your app's full features and functionality." "Before You Submit": provide "an active demo account or fully-featured demo mode, plus any other hardware or resources … (such as login credentials or a sample QR code)". Guideline 4.2 (minimum functionality: "elevate it beyond a repackaged website") is a likely next question for an app that shows web screens; the demo should make the app's own value visible.

## Decided direction (founder)

- A demo mode, no test node: the reviewer never needs a node, a tailnet, a pairing QR of a real node or a credential.
- The demo opens from **"Try demo"** on the iOS app's first (connection) screen, and **also by scanning a demo QR code** that goes into Apple's review notes (Apple's second item; it lets the reviewer exercise the scanner).

## Constraints (engineering)

- **The same screens as the real phone app.** One codebase: the demo is a data source behind the real `/mobile` screens (run list, run screen, conversation, ⋮ menu: Artifacts, Files, Messages, Activity, Settings with runtime and model, VNC where applicable; New run; "On this phone" Text size; Background Tasks), not a copy of the UI. The design repository's mock boundary (`/Users/normy/autobyteus_org/autobyteus-web-design/mock-boundaries.md`, `ui-reference-runbook.md`, the mobile mock data) already runs the real `/mobile` screens on invented data and is the natural base.
- **Nothing leaves the phone in the demo**: invented agents, teams, Orgs, runs and conversations; actions are in-memory (or read-only, the design decides which). No node address, no credential, and the demo is never a way into a real node.
- **iPhone and iPad** (the app is built for both; Apple reviewed on both).
- **It must keep working with every version** (one codebase; engineering tests it on every release).
- The iOS app today: a native first screen (scan / paste / manual node URL, Tailscale diagnostics) and a `WKWebView` for the node's `/mobile` page (`autobyteus-ios/README.md`). It lacks Android's scan-first screen, connect-without-questions, node names and Switch node (autobyteus-395 FU-001).
- No Apple submission, TestFlight upload or App Store Connect change without the founder's explicit word.

## What the design must answer

1. **"Try demo" entry** on the iOS first screen: where and how it reads; does the first screen need Android's scan-first design for this (395 FU-001), or only the entry?
2. **The demo QR code**: what the reviewer scans (a QR image for the review notes) and what happens (the same demo opens).
3. **Inside the demo**: how the phone shows it is a demo (a label, and how to leave it back to the first screen), and that nothing is real.
4. **Sample content** that "exhibits the app's full features": which agents, Teams, Orgs and runs, conversations (incl. tool calls, files, artifacts, messages between agents, a background task), and which actions respond (sending a message and getting a scripted reply, Stop, Settings Save, New run) versus read-only, so a reviewer can try every feature.
5. **iPad**: how the same screens look on an iPad Air 11-inch.
6. **The review notes**: the short text for App Review Information (how to enter the demo, the QR), for the founder to approve before anything goes to Apple.

## Open choice for the founder (with the Solution Designer's recommendation)

- **Demo built into the app (works offline)** vs **a demo page on the website** (e.g. autobyteus.com/demo/) opened by the button. Recommendation: built in. It needs no server or network during review, cannot be down when Apple looks, and keeps one version of the screens per app build; a website demo can drift from the app version under review. The design may show the founder both if useful.

## Feasibility status

- Running the real `/mobile` screens on invented data: shown by the design repository's mock boundary (Proven for the web screens).
- Packaging `/mobile` inside the iOS app for offline use: Not yet established (engineering verifies in its design; the design should not depend on details beyond "the real screens, offline").
- Apple's acceptance of a demo mode: Apple's own message says it is acceptable; the guideline says "with prior approval": a reply in the App Review thread before resubmission is advisable (founder's word needed).

## Deliverable expected

An approved UI/UX specification with runnable reference and final screenshots (iPhone and iPad), the founder's confirmation recorded, linked back to this engineering ticket.

## Route

- 2026-11-18: delegated to `/product_team` (team run `product_team_8f4986ea87424c66a80ac4496399e72c`, coordinator `product_ui_ux_designer_313dd69fa4ff40d8a423bc1b850c54d0`) on the founder's word ("dedicated task to the product team"). No Task of its own (this work is part of autobyteus-279).
