# Requirements Document — one-step-phone-pairing (autobyteus-395, with autobyteus-391)

## Document Status

- Status: `Ready for Approval` (SR-008; SR-007 before). All decisions settled; approval follows the user's confirmation of the Product design. The user's answers of 2026-11-07 settle DEC-001 and DEC-003; DEC-002 is decided A within his direction; DEC-004 (warning once per computer or never) stays open and is shown in the Product design for his choice. Approval follows the Product design and his confirmation of it.
- Current solution revision ID: `SR-008`
- Package identifier: `one-step-phone-pairing`
- Request / ticket: Project Task `autobyteus-395` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); also covers the cancelled `autobyteus-391`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-07
- Approved by and reference: not yet
- Exact approved requirements baseline: not yet
- Behavior-defining supplements: the Product Team's UI/UX design, requested 2026-11-07 ([product-design-request.md](product-design-request.md)); not yet approved
- Investigation: [investigation-notes.md](investigation-notes.md), evidence E-01…E-19

## Problem And Desired Outcome

- **Problem.** Connecting a phone takes a Tailscale terminal guide, a typed or chosen address (often a useless one, such as a link-local IPv6 address), a cleartext checkbox on the desktop, another checkbox and button on the phone, and one more "Pair this phone" tap (E-01, E-02, E-03, E-09, E-13). For a Docker node the user must know the host address and port and type it (E-04, E-05). On the phone several nodes all look like "AutoByteus Desktop", the first screen is a form, and there is no way to change node from inside the app's page (E-10, E-11, E-12).
- **Affected actors.** The user at the desktop; his Android phone; every node he runs (the desktop's own node, his two Docker nodes, nodes on other machines).
- **Desired outcome.** On the desktop, for any node: one action, "Connect a phone", shows one QR. The node works out the phone-reachable address itself and says in plain words how the phone will connect (anywhere through Tailscale, or on this Wi-Fi) and, only when needed, the one thing to do. On the phone: open the app, scan, connected. Every node keeps its own name; adding another node is "scan another QR"; switching between nodes is one tap away, also from inside a node's page.
- **Observable definition of success.** With an isolated desktop node and an isolated Docker node:
  - the user creates a QR for each without typing or choosing any address;
  - a phone with the app scans each and reaches each node's run list with no other input;
  - the phone lists both nodes under their own names and switches between them from inside the page;
  - an already-paired phone keeps working without pairing again.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current Behavior (evidence) | Desired Behavior | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Desktop node: enable, guide, choose/paste URL, acknowledge HTTP, Create QR | One action shows a QR; the address is chosen and verified automatically; one plain-words line on how the phone will connect | Pairing code rules; HTTPS preferred; HTTP only on private addresses with an explicit trust decision | E-01…E-03 |
| BEH-002 | User | SCN-003 | Docker node: manual URL only (container sees no host address) | Same one action; addresses are the host's addresses with the node's published port, verified to reach that node | Verification that the address reaches the same node | E-04, E-05, E-17 |
| BEH-003 | User | SCN-004 | Node on another machine: manual URL only | Same one action; the node's own addresses and the address the desktop reaches it at, verified; manual URL kept under "Other options" | Same-node verification | E-02 |
| BEH-004 | User | SCN-005 | Phone scan: HTTP needs a second acknowledgement; page needs "Pair this phone" | A scan of a pairing QR in the app connects with no other input | Typed HTTP URLs on the phone keep their acknowledgement | E-09, E-13 |
| BEH-005 | User | SCN-006, SCN-007 | Several nodes: same name, native list only, reached by Back | Each node's own name; scan-first list; "Switch node" and "Add a node" from inside the page (DEC-001) | Each node keeps its own credential and session | E-10…E-12 |
| BEH-006 | User | SCN-008 | Paired phones: Active / Revoked-History tabs, Revoke all next to Create QR | Active phones in view; history out of the way but kept; revoke per phone; revoke-all less prominent | Revoke semantics and kept records | E-01, E-15 |
| BEH-007 | Contract | SCN-009 | Existing phones, saved nodes, QR v1 links | Unchanged for existing phones; new QR still readable by the current app | All | E-11, E-15 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| The user at the desktop | Connect a phone to any of his nodes quickly | One action, one QR, plain words | No AutoByteus change to his network without his word (DEC-002) |
| The user on the phone | Reach any of his nodes | Scan → connected; switch nodes easily | No new Android permission |
| Each node | Accept only intended phones | Single-use short-lived code; revocable credentials | Trusted private network model (remote_access.md) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Connect a phone to the desktop's own node with one action | SCN-001, SCN-002 |
| UC-002 | Connect a phone to a local Docker node with one action | SCN-003 |
| UC-003 | Connect a phone to a node on another machine with one action | SCN-004 |
| UC-004 | Scan on the phone and be connected | SCN-005 |
| UC-005 | Hold several nodes on one phone, each by its own name; add another | SCN-006 |
| UC-006 | Switch between paired nodes, also from inside a node's page (Android app) | SCN-007 |
| UC-007 | See and manage paired phones on the desktop | SCN-008 |
| UC-008 | Keep existing phones and links working | SCN-009 |

### Out Of Scope

- AutoByteus installing, signing in to or configuring Tailscale (unless DEC-002 B).
- Public internet exposure, relays, Funnel, accounts or cloud pairing.
- One saved node reachable at several addresses with one pairing (home Wi-Fi and Tailscale both, without re-pairing): DEC-005, follow-up FU-002.
- iOS app changes (autobyteus-279 is paused); the QR stays readable by its parser where it reads v1 (FU-001).
- Least-privilege phone authorization, credential rotation, native secure credential storage (future-tickets/mobile-backend-authorization-hardening.md).
- Starting runs directly on a peer from the phone (277 DEC-003 C).
- Showing peer nodes on the phone in another place after the sheet's peer list is removed (REQ-019).
- The Product Team's design process and repository.

### Non-Goals

- Making an unreachable phone reachable: when neither Tailscale nor the same network is available, the app says so; it does not tunnel.
- Deleting revoked phone records.

### Preserved Behavior Boundary

- BEH-007 in full; pairing code lifetime and single use (REQ-016); the 403 Origin rule and phone route list; phone credentials cannot manage pairing or devices; HTTP is refused for non-private hosts.

### Prerequisites

None found.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved REQ, AC or preserved-behavior ID.
- New product behavior, policy, threat model, migration obligation, compatibility promise or operational contract is a `Requirement Gap` and needs the user's approval.
- Adjacent concerns go to `follow-ups.md`, unless they are prerequisites.
- Reviewer comments do not amend this basis.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The desktop offers one action, "Connect a phone", for the node of the current window (desktop node, Docker node, node on another machine). It shows a pairing QR without the user typing, choosing or confirming an address, except for the one-time home-network trust decision (REQ-004). If Phone Access is off, the action turns it on (the click is the consent) | BEH-001…003 | Must | The user's "just one button" | N/A | User 2026-11-06; DEC-009 |
| REQ-002 | The user never selects an address. Addresses offered to the phone are worked out automatically and ranked: (0) the address an admin configured for the node (e.g. a company `https://` name), when checked to reach this node; (1) the node's Tailscale HTTPS name when checked; (2) its Tailscale address; (3) its VPN address (a tunnel connection such as WireGuard); (4) its local Wi-Fi/cable address, only when that network is allowed (REQ-004). Loopback, container-internal, link-local (`fe80::`, `169.254.*`) and public plain-HTTP addresses are never offered | BEH-001…003 | Must | The user, 2026-11-07: VPN use; "I still need to select the address … Yes or no" | E-03, E-06 (Measured on macOS); tunnel-interface detection to confirm (U-004) | DEC-003; DEC-012; DEC-013; SR-004, SR-005 |
| REQ-003 | Every address put into the QR has been checked to reach the same node (same node ID) at the time the QR is made. An address that cannot be checked is left out | BEH-001…003 | Must | Honest QR; reuses the existing same-node check | E-02, E-06 | — |
| REQ-004 | Local Wi-Fi/cable HTTP stays an explicit trust decision, asked once per local network: the first time a node on this computer would use the current local network, the desktop asks "Allow phones on this network?" ("Fine for home and office networks. On public Wi-Fi, use Tailscale instead." [Allow] [Not now]). The answer is remembered for that network and shared by every node on this computer; on a new network it asks again. If the network cannot be recognised, the answer is remembered per computer. Shown as "Local Wi-Fi allowed" in Other options, changeable. "Not now" with no other path: no QR, one line "On this network, use Tailscale or your VPN." Tailscale and VPN addresses need no question | BEH-001 | Must | Laptops move between home and cafés; calm, honest copy (the user: "without encryption, people feel scared") | Network recognition to confirm (U-005) | DEC-004 (once per network), DEC-013; SR-005 |
| REQ-005 | The panel says in one line how the phone will connect: "Works anywhere through Tailscale", "Works through <company address>" or "Works on this network" (Wi-Fi, LAN or VPN). Only when something is missing it adds the one thing to do (e.g. "To connect away from this network, install Tailscale on this computer and your phone") | BEH-001…003 | Must | Plain words; correct for VPN | N/A | SR-004 |
| REQ-006 | Docker node: the same action works from the Docker node's window. Its addresses are the host computer's addresses (REQ-002) with the port the node is published on; each is checked to reach that Docker node (REQ-003) | BEH-002 | Must | Docker node "also … scan" | E-04, E-05 (Measured) | — |
| REQ-007 | Node on another machine: the same action works from its window; its addresses come from that node and from the address the desktop reaches it at, each checked (REQ-003). When none can be checked, the panel says so and offers "Use a different address" (REQ-020) | BEH-003 | Must | Remote nodes too | E-02 | — |
| REQ-008 | Tailscale HTTPS (optional, under "Other options"): when Tailscale is running on the computer but its HTTPS name does not reach this node, the panel can show the one exact command for this node (its own port and an HTTPS port free of the other nodes'), Copy, and "Check again". The current guide's `serve reset` is not offered. Whether AutoByteus may run the command on a click is DEC-002 | BEH-001, 002 | Should | Removes the terminal guide; keeps the network the user's | E-06, E-07, E-08 | DEC-002 (Needs user) |
| REQ-009 | The QR holds a short-lived single-use code, the node's name and the ordered addresses (REQ-002). It holds no long-lived secret. The current app (which reads one address) still pairs with a new QR, using the first address | BEH-004, 007 | Must | Several addresses without breaking installed apps | E-15 | DEC-006 |
| REQ-010 | Phone, in the app: scanning a pairing QR connects with no other input. The app tries the QR's addresses in order and pairs with the first that answers; it asks no HTTP acknowledgement for a scanned pairing QR (the desktop made that decision) and no device name (it uses the phone's model name). If no address answers, it says in plain words what is missing (e.g. "Can't reach <node>. Connect to the same Wi-Fi or VPN as the computer, or turn on Tailscale") | BEH-004 | Must | "scan, and then I'm connected" | E-09, E-13 | DEC-004, DEC-007 |
| REQ-011 | Every node appears on the phone under its own name: the name the desktop shows for it (from the QR), not a fixed "AutoByteus Desktop" | BEH-005 | Must | Several nodes must be told apart | E-10 (Measured) | — |
| REQ-012 | The app's first screen is scan-first: one primary "Scan QR code" action, the saved nodes as a simple list (name, reachable or not, open; remove behind a secondary action), and typing an address, pasting a link and HTTP options under "Other ways to connect". No setup paragraph. Opening the app still opens the last used node | BEH-005 | Must | "complicated and ugly" | N/A | Product design |
| REQ-013 | Adding a node never removes another; a node is added from the app's node list (its Scan button). In the Android app, the page's node sheet offers "Switch node" (the app's node list with reachability), one tap from any screen. No "Add a node" entry in the sheet. No credential leaves its node's page | BEH-005 | Must | 391; "switch between different nodes … very convenient" | E-11 | DEC-001 (B); SR-003 (user in the Product review) |
| REQ-014 | Desktop paired phones: active phones with name, how they connect and last seen, Revoke per phone; "Revoke all" kept but not next to the main action; revoked phones hidden behind "History (n)", kept | BEH-006 | Should | Tidy; nothing lost | E-15 | DEC-008 |
| REQ-015 | The QR is shown on request, with its remaining time; when it expires, one "New code" action. Closing the panel discards the shown code | BEH-001 | Should | Smaller leak window; clear state | N/A | DEC-010 |
| REQ-016 | Preserved security rules: 5-minute single-use code; credential shown only to the phone once; phone credentials cannot manage pairing or devices; revoke works at once; pairing data is redacted in logs; HTTP refused on non-private hosts | BEH-007 | Must | Security baseline | E-15 | — |
| REQ-017 | Existing paired phones, existing saved nodes and existing pairing links keep working without pairing again | BEH-007 | Must | Task constraint | E-11, E-15 | — |
| REQ-018 | A phone without the app: scanning the QR with the camera opens the node's page in the browser, which pairs with one "Connect to <name>" tap and offers the Android app download | BEH-004 | Should | "pointed at a node without typing a URL" | E-13, E-19 | DEC-007 |
| REQ-019 | The 277 node sheet (UIS-010/VIS-019) changes: the read-only "Peer nodes" list is removed from it; "Check connection" becomes a refresh icon button while the node is reachable and the word "Retry" when it is not. The node chips on runs ("docker", "office-mac") stay. This supersedes the peer-list part of 277 REQ-008 / DEC-003 A | BEH-005 | Must | The user in the Product review, 2026-11-07 (relayed by the Product UI/UX Designer; his words to be recorded from the confirmed spec) | N/A | SR-003 |
| REQ-020 | The desktop never presents the Wi-Fi permission and a hand-typed address as two settings to fill in. When a way works, nothing is asked. When none works, one choice of two alternatives: "Allow this Wi-Fi" or "Use a different address", and no QR until one is chosen. Otherwise "Use a different address" is only a small link under the QR. A hand-typed plain local address is subject to REQ-004 | BEH-001…003 | Must | The user's confusion, 2026-11-07 | N/A | DEC-014; SR-006 |
| REQ-021 | The desktop panel has a collapsed "How does this work?" section at its bottom (also opened by a "How?" link on the result line). Inside: a short intro, one card per way to connect (same Wi-Fi; Tailscale; your own VPN; an address set up for this node), each with When / Setup / Safety in plain words, the card in use marked "In use"; then the QR code and phones (once, 5 minutes, one-time code not a password; revoke a lost phone; never opened to the public internet). No commands | BEH-001 | Should | The user, 2026-11-07: "I'm kind of afraid that the user don't understand how things work"; "a separate section for each types, make it more detailed … so they feel more secure … know how to set it up" | N/A | SR-007, SR-008 |

## Acceptance Criteria

| AC ID | REQ | Scenario | Precondition / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002, 003, 005 | SCN-001 | Isolated desktop node, Tailscale with HTTPS name reaching it; Phone Access off | One click on "Connect a phone" turns Phone Access on and shows a QR and "Connects anywhere through Tailscale"; no address field, list or checkbox was needed | — | Desktop E2E with a stubbed address/verification boundary; manual on a real host |
| AC-002 | REQ-002, 004, 005 | SCN-002 | Node without Tailscale, on a private LAN | First time: one trust question; after "Use this Wi-Fi", QR with the LAN address and "Connects on this Wi-Fi only" plus the Tailscale hint; next time no question | "Not now" → no QR, the hint stays | E2E |
| AC-003 | REQ-002 | SCN-001, 002 | Host with link-local IPv6, loopback, container and public addresses | None of them appears in the QR or the panel | — | Unit |
| AC-004 | REQ-006 | SCN-003 | Isolated Docker node published on the host | From its window one click gives a QR whose addresses are host address + published port, each checked to reach that node | Port not published on the network → plain words, no QR | E2E with an isolated container |
| AC-005 | REQ-007 | SCN-004 | Node on another machine reachable at a private address | QR with checked addresses | None checkable → message and "Enter an address" | E2E (two isolated nodes) |
| AC-006 | REQ-008 | SCN-001 | Tailscale running, HTTPS name not reaching this node | Panel shows the one command for this node's port, Copy, Check again; after setting it up, Check again shows the Tailscale HTTPS state | Tailscale absent → only the install hint | Unit + manual |
| AC-007 | REQ-009, 017 | SCN-005, 009 | New QR scanned by the current released app | Pairs on the first address | — | Android unit (parser) |
| AC-008 | REQ-010 | SCN-005 | App, fresh install, isolated node, HTTP LAN QR | Scan → run list, no checkbox, no name field, no extra tap | No address answers → plain-words reason, Scan again | Android instrumented / emulator |
| AC-009 | REQ-011 | SCN-006 | Two isolated nodes named differently on the desktop | The phone lists both with those names | — | Android unit + emulator |
| AC-010 | REQ-012 | SCN-006 | App with 0 and with 2 saved nodes | First screen per the approved design; scan primary; typing under "Other ways" | — | Emulator screenshots vs. design |
| AC-011 | REQ-013 | SCN-007 | Two paired nodes, inside node A's page | "Switch node" → node list → tap B → B's run list; the list's Scan adds a node | Node B unreachable → shown as such | Emulator |
| AC-016 | REQ-019 | SCN-007 | Node sheet open | No peer list; refresh icon when reachable; "Retry" when not; run chips unchanged | — | Component test + emulator |
| AC-012 | REQ-014 | SCN-008 | Node with 1 active, 31 revoked | Active list shows 1; "History (31)" collapsed; records unchanged | — | Component test |
| AC-013 | REQ-015, 016 | SCN-001 | QR shown | Remaining time visible; after 5 min "New code"; a used or closed code is refused | — | Unit + E2E |
| AC-014 | REQ-017 | SCN-009 | Phone paired before the change | Opens and works after the update, no re-pair | — | Emulator with pre-change data |
| AC-015 | REQ-018 | SCN-005 | Browser on a phone, pairing link | One "Connect to <name>" tap pairs; app download offered | — | Browser E2E |

## Relevant Scenarios And Journeys

| Scenario | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Phone on the desktop node, with Tailscale | Nodes › Phone Setup › Connect a phone | Tailscale on computer (and phone) | Click → QR "anywhere through Tailscale" → scan → connected | Paired over Tailscale | HTTPS name not set → one command; tailnet address used meanwhile (DEC-003) | Supported Normal | User 2026-11-06 | REQ-001…005, 008; AC-001, 003, 006, 013 |
| SCN-002 | User | User | Same, without Tailscale | Same | Same Wi-Fi | Click → trust question once → QR "this Wi-Fi only" → scan | Paired on the LAN | "Not now" | Supported Normal | Same | REQ-002, 004, 005; AC-002 |
| SCN-003 | User | User | Phone on a Docker node | Docker node window › Connect a phone | Docker node running, port published | As SCN-001/002 with host addresses | Paired with the Docker node | Port not reachable | Supported Normal | "On the Docker node … scan" | REQ-006; AC-004 |
| SCN-004 | User | User | Phone on a node on another machine | That node's window | Node reachable privately | As SCN-001/002 | Paired | None checkable → enter an address | Supported Normal | Task | REQ-007; AC-005 |
| SCN-005 | User | User | Scan and be connected | App › Scan QR code (or camera without the app) | QR on screen | Scan → try addresses → pair → run list | Connected | No address answers → reason | Supported Normal | User | REQ-009, 010, 018; AC-007, 008, 015 |
| SCN-006 | User | User | Several nodes on one phone | App first screen › Scan / list | One node paired | Scan another node's QR | Both listed by name | — | Supported Normal | "two Docker nodes and desktop nodes" | REQ-011, 012; AC-009, 010 |
| SCN-007 | User | User | Switch node from inside a page | Node name › Switch node | Two nodes paired | Pick another | Its run list | Unreachable node shown | Supported Normal if DEC-001 = B | 277 user words | REQ-013; AC-011 |
| SCN-008 | User | User | Manage paired phones | Phone Setup | Phones paired | View, revoke, history | Tidy list | — | Supported Normal | Screenshot | REQ-014; AC-012 |
| SCN-009 | Contract | Installed apps, existing pairings | Keep working | App update / old link | Paired phone | Open | Works | — | Supported Normal | Task constraint | REQ-017; AC-007, 014 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement: the Product Team's design, to be requested after DEC-001…DEC-004 (they change the screens). Not yet approved.
- Runnable reference, repository, ticket, revision, confirmation, visual baseline: N/A until returned.
- Required screens and states: desktop "Connect a phone" panel (states: Tailscale HTTPS ready; Tailscale without HTTPS name; Wi-Fi only with trust question; nothing reachable; QR with time left; expired); paired phones with history; phone first screen (0 nodes, several nodes, one unreachable); pairing progress and failure; node sheet with Switch node / Add a node; the browser pairing page.
- Product decisions that need the user: DEC-001 (switch inside the page) and any taste decision the Product Team brings.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement | Scope | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-016 | Security | No long-lived secret in a QR, link, log or committed file; pairing values redacted | All | Unit + log check |
| QR-002 | REQ-002, 004 | Security | Unencrypted home-network HTTP is never used without the remembered explicit decision; public addresses never | Pairing | Unit |
| QR-003 | REQ-013 | Security | No new Android permission; no credential crosses between nodes' pages or into the app's native list | Android | Manifest test; review |
| QR-004 | REQ-001 | Operability | The QR appears within 3 s of the click on a normal LAN (address checks run in parallel with short timeouts) | Desktop | E2E timing |
| QR-005 | REQ-017 | Compatibility | Installed app and existing pairings unchanged in behavior | All | AC-007, AC-014 |
| QR-006 | REQ-002, REQ-004 | Compatibility | Platform priority: macOS and Linux hosts are verified for Tailscale, VPN and local-network recognition; Windows is low priority (the user, 2026-11-07): no Windows-specific work, it uses the safe fallbacks (an unrecognised VPN is treated as local Wi-Fi and asked; the Wi-Fi answer is remembered per computer). If the same approach also works on Windows, that is a welcome bonus (the user: "if it can work, then that's fine … That's a bonus"), not a requirement | Desktop and node hosts | Checks on macOS and Linux; Windows only must not break |

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes`, additively — possibly a remembered trust decision per node; Android saved entries may gain fields.
- Must be preserved: all paired-device records (active and revoked), credentials, node identity, Android saved nodes.
- Acceptable loss: none.
- Unknowns: whether saved-entry changes need a transition (architecture).

## External Contracts And Dependencies

| Dependency | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Tailscale | Detected only through ordinary network facts (addresses, reverse name lookup, HTTPS probe); not run (unless DEC-002 B) | E-06, E-07 | U-001 |
| Docker | Server port published on the network | E-05 | Users publishing on loopback get a plain-words message |
| Android WebView | Same-origin pages; app keeps its own node list | E-11 | — |

## Supplemental Artifacts

| Artifact | Purpose | REQ / AC | Status | Approval |
| --- | --- | --- | --- | --- |
| [follow-ups.md](follow-ups.md) | Follow-ups found | — | Created | — |
| Product design (pending) | Screens | REQ-001, 005, 010, 012…015, 018 | Not requested yet | Needs the user's confirmation |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A `.ts.net` reverse name is a reliable sign that an address is Tailscale | DEC-003 relies on it | Architecture (U-001) | Open |
| ASM-002 | Today's phone features need no secure context, so an HTTP tailnet address loses nothing | DEC-003 | E-14 | Supported (Read) |

## Decisions

| ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Switch between nodes inside the page (277 DEC-003 B)? | Scope and the Android app; his 277 wish | A: only the app's first screen. B: "Switch node" and "Add a node" in the page's node sheet, opening the app's node list; no credential crosses | B costs one small signal from page to app and makes several nodes as easy as he asked. Browser users keep separate tabs. **B.** The user, 2026-11-07: "they want to be able to connect multiple nodes so that they could switch between different nodes on phone"; "yes send to product team" | The user | Decided (B) |
| DEC-002 | May AutoByteus run the Tailscale HTTPS command for him? | Today it deliberately does not run Tailscale | A: show the one exact command + Copy + Check again. B: a "Set it up for me" button that runs that one command on his click | With Tailscale on, the tailnet address already works anywhere (DEC-003), so the HTTPS name is polish. A keeps his network his own with one copy-paste once per node. **A**, decided within his direction: it keeps today's rule that AutoByteus does not run Tailscale, and with DEC-003 the HTTPS name is optional, so the hint sits under "Other options", not in the main path | Solution Designer | Decided (A) |
| DEC-003 | Treat a confirmed Tailscale address (100.x with a `.ts.net` name) as private and encrypted, with no cleartext warning? | Decides whether Tailscale without HTTPS setup is one click | Tailscale encrypts device to device (WireGuard); today it is grouped with LAN HTTP and needs the checkbox | Honest and the simplest path to "with Tailscale it just works"; the page is plain HTTP inside the tunnel, which today's phone features accept (E-14). Unconfirmed 100.x stays "home network". **Yes.** The user, 2026-11-07: "no matter they connect tailscale or not. they just want to generate a qrcode, and scan immediately" | The user | Decided (yes) |
| DEC-004 | Home-network HTTP: ask once per node on the desktop and remember it; no second question on the phone for a scanned QR? | Trust decision placement | Today: checkbox every time on desktop and again on the phone | The decision stays explicit, once, where the QR is made; the QR could not exist without it. Typed HTTP addresses on the phone keep their own question. **Recommend once per computer.** No second question on the phone after a scan is settled by his "scan immediately". Once-per-computer vs. never: asked 2026-11-07, not yet answered; the Product design shows the once-per-computer version and notes the "never" variant for his choice Settled in SR-005 as **once per network** (falls back to per computer when the network cannot be recognised), by the Solution Designer at the user's word "you know the different network environments more than me" | Solution Designer (the user delegated) | Decided |
| DEC-005 | One saved node usable at several addresses (Wi-Fi at home, Tailscale away) without re-pairing? | Would need the app to hold credentials natively | With Tailscale on the phone, the Tailscale address also works at home, so this matters only for phones without Tailscale | Not needed for his flow; large change. Out of scope, follow-up FU-002 | Solution Designer | Decided |
| DEC-006 | Several addresses in one QR? | Phone may not be on the same network as the best address | QR v1 has one `serverBaseUrl` | Ordered list, phone tries in turn; the first address stays in the old field so installed apps work | Solution Designer | Decided |
| DEC-007 | Confirm before pairing? | A link could pair a phone to a stranger's node | App scanner: user meant it. Browser link: could come from anywhere | App scan pairs at once; browser shows one "Connect to <name>" tap | Solution Designer | Decided |
| DEC-008 | Revoked history | 31 rows clutter | Delete or hide | Hide behind "History (n)"; delete nothing | Solution Designer | Decided |
| DEC-009 | Separate enable step? | One button | The click is consent; "Turn off phone access" remains | Merge | Solution Designer | Decided |
| DEC-010 | QR lifetime on screen | Leak window | Today shown until replaced | Shown on request with time left; closed = discarded; same 5 minutes | Solution Designer | Decided |
| DEC-012 | Company VPN; sections per network type? | The user, 2026-11-07: "we will use VPN a lot … do we also support that?"; "Maybe use different sections … you know the best" | Separate sections for Tailscale / VPN / Wi-Fi vs. one automatic path | A company VPN is another private network: supported by the same automatic path, plus an admin-configured address used automatically and network-neutral wording. Sections per network type would bring back the choice that confused him; the main panel stays one button. "Other options" is grouped by purpose: Network ("This network allowed"), Address (enter by hand), Phone access (turn off). Limit: VPNs that block device-to-device traffic can only reach nodes on servers | Solution Designer (the user: "you know the best") | Decided |
| DEC-013 | Treat VPN tunnel addresses (WireGuard and similar) like Tailscale: trusted, no question? | The user, 2026-11-07, shared office + WireGuard: "Do I turn this network allowed? When do I turn this on?" | A per-computer switch would also allow the shared Wi-Fi address next to the VPN one | A personal VPN protects phone-to-computer traffic; a company VPN leads into the company's own network, already a trusted network in remote_access.md. Unrecognised connections are treated as local Wi-Fi and asked. **Yes**; the switch covers local Wi-Fi/cable only | Solution Designer (the user: "you know the different network environments more than me") | Decided |
| DEC-014 | Where "Allow this Wi-Fi" and "Use a different address" live | The user, 2026-11-07: "do I have to do two both at the same time?" | Both in Other options vs. alternatives shown only when needed | They are alternatives and usually neither is needed. Shown together only when no way works, as "Allow this Wi-Fi" or "Use a different address"; otherwise "Use a different address" is a small link under the QR ("Phone can't connect? …"), and Other options keeps only the change-later controls (Local Wi-Fi switch, Turn off phone access). A hand-typed plain local address follows the same Wi-Fi rule | Solution Designer (the user: "you know the best") | Decided |
| DEC-011 | iOS | 279 paused | — | Out of scope; FU-001 | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Design evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001…003 | BEH-001…003 | AC-001 | SCN-001…004 | Product design |
| REQ-002 | UC-001…003 | BEH-001…003 | AC-001…003 | SCN-001…004 | — |
| REQ-003 | UC-001…003 | BEH-001…003 | AC-001, 004, 005 | SCN-001…004 | — |
| REQ-004 | UC-001 | BEH-001 | AC-002 | SCN-002 | Product design |
| REQ-005 | UC-001…003 | BEH-001…003 | AC-001, 002 | SCN-001…004 | Product design |
| REQ-006 | UC-002 | BEH-002 | AC-004 | SCN-003 | — |
| REQ-007 | UC-003 | BEH-003 | AC-005 | SCN-004 | — |
| REQ-008 | UC-001, 002 | BEH-001, 002 | AC-006 | SCN-001 | Product design |
| REQ-009 | UC-004, 008 | BEH-004, 007 | AC-007 | SCN-005, 009 | — |
| REQ-010 | UC-004 | BEH-004 | AC-008 | SCN-005 | Product design |
| REQ-011 | UC-005 | BEH-005 | AC-009 | SCN-006 | — |
| REQ-012 | UC-005 | BEH-005 | AC-010 | SCN-006 | Product design |
| REQ-013 | UC-006 | BEH-005 | AC-011 | SCN-007 | Product design |
| REQ-014 | UC-007 | BEH-006 | AC-012 | SCN-008 | Product design |
| REQ-015 | UC-001 | BEH-001 | AC-013 | SCN-001 | Product design |
| REQ-016 | UC-008 | BEH-007 | AC-013 | SCN-009 | — |
| REQ-017 | UC-008 | BEH-007 | AC-007, 014 | SCN-009 | — |
| REQ-018 | UC-004 | BEH-004 | AC-015 | SCN-005 | Product design |
| REQ-019 | UC-006 | BEH-005 | AC-016 | SCN-007 | Product design |
| REQ-020 | UC-001…003 | BEH-001…003 | AC-002, AC-005 | SCN-002, SCN-004 | Product design |
| REQ-021 | UC-001…003 | BEH-001 | AC-001 | SCN-001…004 | Product design |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-009.
- Constraints: trusted private network model; 403 Origin rule and phone route list; additive QR payload; no new Android permission; no credential crossing.
- Deferred to architecture: who gathers and checks host addresses for a Docker node (desktop side) and how the desktop asks the Docker node to make the code with them; where the remembered trust decision lives; how the page asks the app for its node list; the HTTPS port choice per node for the Tailscale command.
- Technical facts to verify (macOS and Linux; Windows low priority, QR-006): U-001 (Linux, MagicDNS off), U-003 (desktop probing other nodes' addresses under the Origin rule), U-004 (recognising a VPN tunnel connection on macOS, Linux, Windows), U-005 (recognising the current local network without a new permission).
- Feasibility risks: R-001 (an address checked from the computer may not be reachable from the phone — covered by trying in turn and plain words).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes` (SCN-007 depends on DEC-001)
- Product design and supplemental evidence integrated: `N/A` (not yet requested)
- UI/UX approval basis recorded: `N/A` (pending)
- Material assumptions and decisions visible, with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`, pending the user's DEC-001…DEC-004
- Remaining content blocker: the user's answers

### Approved Basis Ready For Design

- Approval recorded: `No`
- Exact requirements and supplement approval basis recorded: `No`
- Approved requirements package ready for architecture design: `No`
- Remaining blocker: the user's decisions; then the Product design and his confirmation of it
