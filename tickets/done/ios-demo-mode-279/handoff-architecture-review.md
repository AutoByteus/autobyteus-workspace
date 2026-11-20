# Handoff: ios-demo-mode-279 → Architecture Review

- Result: `Architecture Design Complete`, `task_size = Large`, `architectural_risk = High`. Rule: Large or High → `/architecture_reviewer`.
- Task: autobyteus-279 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); SR-001.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279/tickets/in-progress/ios-demo-mode-279/`
- Worktree / branch / base: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-mode-279`, `codex/ios-demo-mode-279`, `origin/personal` `8430d9ef12`. The untracked `autobyteus-application-*/dist/` folders are build output from the inventory run; they are not part of the change.

## Original request

- Apple rejected the iOS app under 2.1(a). The reviewer needs a full-featured demonstration mode (not a video) and a demo QR code (`evidence/apple-review/`).
- The founder: "we can just provide a demo right then yeah try demo we don't need a test node".
  - His rule: the demo works "100% like how your real application works", and iOS works like Android.
  - He approved the screens ("I trust you … if you think it passed your verification then we're ready").
  - He left the mechanism to the Solution Designer ("you decide you know the best of the project and what apple required").

## Approval basis

- Requirements approved by the founder (`requirements-doc.md`, Document Status).
- Product's approved UI/UX specification: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/ios-demo-mode-279/ui-ux-spec.md`, VIS-001…VIS-037, reference `78b51f73`.
- My App Reviewer verification of the design, rounds 1–7: `evidence/demo-verification/verdict.md`.

## What to review

The design spec's core decisions:
1. **The demo node at the wire, in a separate demo build of the phone screens.** It is a `demo/` module that answers the 43 measured GraphQL operations, the REST paths and the stream routes from a sample world. Its answers are typed with the generated GraphQL types and validated against the stream contracts. It is installed by a `demoTransport` that owns `fetch` and `WebSocket` for the demo origin only.
2. **iOS:**
   - a demo web view that loads the bundled build through a scheme handler, with no network (a content rule list) and a non-persistent data store;
   - Android parity: the start screen port, the shell bridge with `leaveDemo`, and the share handoff;
   - the URL scheme `autobyteus://demo`.
3. **The real phone shell:** the iPad layout (768 / 1024 px), DC-007, DC-011 and local icons.
4. **Build:** the iOS gate builds `build:mobile-web --demo` in its own prepare (DESIGN.md rule 12).

Premise not yet verified: R-002 / U-003, WKWebView with a scheme handler and the replaced `fetch` / `WebSocket`. The design makes it the first check of implementation step 3.

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `evidence/architecture/phone-network-inventory.json`
- `evidence/demo-verification/`
- `evidence/apple-review/`

## Constraints

- Nothing goes to Apple, TestFlight or App Store Connect without the founder's explicit word.
- Tests on isolated nodes with scripted runtimes only.
