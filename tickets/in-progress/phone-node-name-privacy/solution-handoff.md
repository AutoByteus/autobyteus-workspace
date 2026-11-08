# Solution Handoff — phone-node-name-privacy (autobyteus-433)

- Result: `Architecture Design Complete`
- Package identifier: `phone-node-name-privacy`; Project Task `autobyteus-433` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Current solution revision: `SR-002`
- Classification: `task_size = Medium`, `architectural_risk = Low` (rationale: `design-spec.md`, Task Size And Architectural Risk)
- Route: direct implementation (handoff rule: Small/Medium and Low → `/software_engineering_team/implementation_engineer`), sent 2026-11-08
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
