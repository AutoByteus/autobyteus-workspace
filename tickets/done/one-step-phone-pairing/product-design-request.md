# Product Design Request — one-step-phone-pairing (autobyteus-395)

- Purpose: `New Request`
- Requested by: the user, 2026-11-07, in the Solution Designer's conversation: "yes send to product team" (after the Solution Designer proposed a small, focused design round for the Android start screen, Switch node and the desktop "Connect a phone" panel).
- From: Solution Designer, Software Engineering Team (`one-step-phone-pairing`, SR-002).
- Requirements: `requirements-doc.md` (Ready for Approval, SR-002) and `investigation-notes.md` in this folder.

## The user's words

- 2026-11-06: "Is it possible like there's just one button? It doesn't matter whether I use Tailscale or not … I just enable it, click and it generates a QR code, I go to my phone, open the software, scan, and then I'm connected. In the future, whenever I want, I can use it. On the Docker node I can also do it this way: scan. I can add multiple nodes on my phone…"
- 2026-11-06: "The very easiest: on the page the user just generates a QR code, and then scans it, that's it. Currently I have to select and input the address or something … on the phone we should make it easier to add more than one node … We have two Docker nodes and desktop nodes."
- 2026-11-07: "you know what user do not like, they got confused, what they want is that no matter they connect tailscale or not. they just want to genreate a qrcode, and scan immediately you know. and they want to be able to connect multiple nodes so that they could switch between different nodes on phone"
- He finds today's phone setup, on the desktop and on Android, "complicated and ugly". He gets confused by technical choices: keep words plain and choices away from the main path.

## What the design must answer (three surfaces)

1. **Android app start screen** (native screen around the node pages; today `autobyteus-android/.../ui/ConnectionScreen.kt`, see screenshot 26.jpg). REQ-010, REQ-011, REQ-012.
   - Scan first: one clear "Scan QR code" action.
   - The user's nodes as a simple list: each node's own name (e.g. "Desktop", "Docker node 1"), online or not, tap to open; remove as a secondary action.
   - Everything else ("type an address", "paste a link", the HTTP option) under "Other ways to connect". No setup paragraph.
   - States: no nodes yet (first launch); several nodes; one node unreachable; connecting after a scan; connected; "can't reach this node" with the plain reason (e.g. "Your phone isn't on the same Wi-Fi as Desktop, and Tailscale isn't on") and Scan again / Retry.
   - Opening the app still goes straight into the last used node; this screen is where "Add a node" and the node list live.
2. **Switch node inside a node's page** (Android app). REQ-013, DEC-001 = B.
   - In the existing node sheet of the mobile redesign (autobyteus-277, opened from the node name; UIS-010, VIS-019): add "Switch node" (opens the node list from surface 1, with reachability) and "Add a node" (opens the scanner). Keep the approved style of that sheet; one tap away from any screen.
   - In a plain phone browser (no app) switching is not offered; each node is its own browser page.
3. **Desktop "Connect a phone" panel** (Nodes › Phone Setup tab; today screenshots 24.png and 25.png). REQ-001, REQ-004, REQ-005, REQ-008, REQ-014, REQ-015, REQ-018.
   - One button, "Connect a phone", for the node of the current window (the desktop's own node, a Docker node, a node on another machine; it works the same in each).
   - The QR, with one plain line on how the phone will connect: "Works anywhere through Tailscale" or "Works on this Wi-Fi only", and the time the code is valid (5 minutes), with "New code" when it expires.
   - Only when something is missing, one plain hint (e.g. "To connect away from home, install Tailscale on this computer and your phone").
   - The home Wi-Fi warning (DEC-004, the user's choice is open): show it **once per computer** as one plain question with one button ("Use this Wi-Fi"), remembered and changeable. Please also note what the "never ask" variant would look like, so he can choose when he reviews.
   - A phone without the app that scans the QR with its camera lands in the browser page: one "Connect to <node name>" button and a link to get the Android app (REQ-018).
   - Paired phones: active phones (name, how they connect, last seen, Revoke); "Revoke all" less prominent; revoked phones behind "History (n)".
   - The long Tailscale guide disappears from the main path. An optional "Other options" area may hold: enter an address by hand, and the one Tailscale command for a secure web address (DEC-002 = A: AutoByteus shows it, does not run it).

## Feasibility status (so nothing visible rests on an unproven claim)

| Element | Status |
| --- | --- |
| Automatic address, no typing, for the desktop node | Feasible (Read + Measured: addresses, Tailscale name found by a reverse lookup on macOS) |
| Same for Docker nodes (host address + published port) | Feasible (Measured: ports published on all interfaces) |
| "Works anywhere through Tailscale" / "this Wi-Fi only" line | Feasible on macOS (Measured); Linux/Windows detection to be confirmed in architecture (U-001) |
| Scan → connected with no other input | Feasible (Read) |
| Node names on the phone | Feasible (the desktop's name for the node travels in the QR) |
| Switch node / Add a node inside the page | Feasible in the Android app (a small page-to-app signal, no new permission); not in a plain browser |
| Paired phones history | Feasible (records exist) |
| One node reached at two addresses without pairing twice | **Not in scope** (FU-002): do not design it |
| iOS | **Not in scope** (FU-001) |

## Constraints and non-goals

- No new Android permission (camera is already granted for scanning).
- No public exposure; home Wi-Fi without Tailscale stays an explicit choice (DEC-004).
- Existing paired phones keep working without pairing again; old QR links still work.
- No real node names, addresses, live QR codes or secrets in screenshots, fixtures or the design repository. The attached screenshots 24.png, 25.png and 26.jpg show the user's real node name and address: use them for reference only and never commit or copy them.
- A focused round: three surfaces, building on the approved mobile redesign (277); not a new redesign of the node pages.

## Existing product context

- 277 approved UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md` (VIS-001…029; the node sheet UIS-010/VIS-019); design repository `/Users/normy/autobyteus_org/autobyteus-web-design`.
- Code: `autobyteus-android/app/src/main/java/org/autobyteus/mobile/ui/ConnectionScreen.kt`; `autobyteus-web/components/mobile/connection/MobileConnectionSheet.vue`; `autobyteus-web/components/mobile/MobilePairingBootstrap.vue`; `autobyteus-web/components/settings/PhoneAccessCard.vue`, `PhoneSetupGuideCard.vue` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/one-step-phone-pairing`).

## Expected result

A UI/UX spec with final references for the three surfaces and their states, confirmed by the user, with the DEC-004 choice in his words. Report back to the Solution Designer (run id in the delegation).
