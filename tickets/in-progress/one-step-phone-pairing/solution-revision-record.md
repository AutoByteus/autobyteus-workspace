# Solution Revision Record — one-step-phone-pairing (autobyteus-395)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-395 with 391 merged, 2026-11-07) | N/A | N/A | Ready for Approval | BEH-001…007; REQ-001…018; AC-001…015; DEC-001…011 | Four decisions asked of the user |
| SR-002 | Requirements | The user's answers, 2026-11-07; Product Design requested | N/A | Ready for Approval | Ready for Approval | DEC-001…004; REQ-008 | DEC-001 B, DEC-003 yes (user); DEC-002 A (Solution Designer); DEC-004 open (once vs. never); Product brief sent |
| SR-003 | Requirements | Product review interim note (user's changes), 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-004, REQ-013, REQ-019 (new), AC-011, AC-016 (new); 277 REQ-008 peer list superseded | Answers to the designer's three questions |
| SR-004 | Requirements | The user's VPN question and "sections" question, 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-002, REQ-005, REQ-010, DEC-012 | Company VPN supported; no per-network sections; Other options grouped by purpose |
| SR-005 | Requirements | The user's WireGuard/shared-office question and "select the address?" question, 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-002, REQ-004, DEC-004, DEC-013 | VPN trusted like Tailscale; local Wi-Fi asked once per network; all decisions settled |
| SR-006 | Requirements | The user's "do I have to do both" question, 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-007, REQ-020 (new), DEC-014 | Wi-Fi permission and hand-typed address shown as alternatives only when needed |
| SR-007 | Requirements | The user's "explain how everything works" question, 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-021 (new) | Collapsed "How does this work?" section |
| SR-008 | Requirements | The user: one section per network type, more detail, 2026-11-07 | N/A | Ready for Approval | Ready for Approval | REQ-021 | Four cards with When / Setup / Safety; text prepared by the Solution Designer |

## Revision Entries

### SR-001 — One action, one QR, scan, connected; several nodes by name

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Task autobyteus-395 (the user's words of 2026-11-06 and 2026-11-07; 391 merged in)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started
- IDs affected: all
- Scenario basis: SCN-001…SCN-006, SCN-008, SCN-009 Supported Normal; SCN-007 Supported Normal if DEC-001 = B
- Why recorded: first baseline for the user's decisions and the Product brief
- Canonical sections: all of requirements-doc.md; investigation-notes.md E-01…E-19
- Supplements: follow-ups.md (FU-001, FU-002)
- Product design incorporated: none yet
- Intended behavior changed: N/A (baseline)
- Approval impact: none yet; DEC-001…DEC-004 need the user; DEC-005…DEC-011 decided by the Solution Designer within the direction
- Behavior-defining supplement versions: none yet
- Design/review basis: N/A
- Classification: N/A
- Handoff: none yet
- Remaining gaps: the user's DEC-001…DEC-004; Product design and his confirmation; U-001, U-003 (architecture)
- Next action: ask the user; then the Product brief

### SR-002 — The user's answers; Product Design requested

- Phase and classification: Requirements, `Refinement`
- Trigger: the user, 2026-11-07: "no matter they connect tailscale or not. they just want to genreate a qrcode, and scan immediately … they want to be able to connect multiple nodes so that they could switch between different nodes on phone"; "do we need to do some ui design for the android user experience?"; "yes send to product team"
- Prior / current status: Ready for Approval / Ready for Approval
- IDs affected: DEC-001 (B, the user), DEC-002 (A, Solution Designer within the direction: keeps today's rule), DEC-003 (yes, the user), DEC-004 (no second question on the phone settled; once-per-computer vs. never open); REQ-008 moved to "Other options"
- Intended behavior changed: refined within the baseline; no new scope
- Supplements: product-design-request.md (new)
- Approval impact: requirements approval waits for the Product design and his confirmation, with DEC-004 answered
- Handoff: Product Design Requested, delegated to `/product_team` at the user's explicit request
- Next action: integrate the returned, user-confirmed design; then approve requirements and design the architecture

### SR-003 — The user's changes in the Product review; answers to the designer

- Phase and classification: Requirements, `Refinement`
- Trigger: interim note from the Product UI/UX Designer (run `product_ui_ux_designer_a1399629bb864a55aecc65bb555fd38b`), 2026-11-07: at the user's word the node sheet loses "Peer nodes" and "Add a node", and "Check connection" becomes a refresh icon / "Retry"; three questions on the desktop tab
- IDs affected: REQ-004 (the "once" variant is once per computer, shared by the nodes on it), REQ-013 (no "Add a node" in the sheet; the app's list has Scan), REQ-019 and AC-016 new (supersedes the peer-list part of 277 REQ-008 / DEC-003 A), AC-011
- Decisions for the designer, as architecture owner: old Phone Setup cards and their unused text keys are removed (no dead code); the phone-access store shrinks to connect / code / devices plus the "Other options" manual address, with address choice and checks moving out of the page; the storage place of the remembered decision is an architecture detail, its behavior is REQ-004
- Intended behavior changed: Yes (user-directed, within this ticket's area); approval with the confirmed design
- Next action: integrate the confirmed design; record the user's words for REQ-019 from it

### SR-004 — Company VPN; no sections per network type

- Phase and classification: Requirements, `Refinement`
- Trigger: the user, 2026-11-07: "we will use VPN a lot of times in the future … do we also support that?"; "Maybe use different sections … You know the best"
- IDs affected: REQ-002 (admin-configured address first, VPN private addresses included), REQ-005 (network-neutral wording), REQ-010 (phone message mentions VPN), DEC-012 (new, Solution Designer at the user's word)
- Intended behavior changed: Yes, within this ticket's area; sent to the Product Team
- Next action: the designer reflects it; approval with the confirmed design

### SR-005 — VPN trusted like Tailscale; local Wi-Fi once per network

- Trigger: the user, 2026-11-07: shared office with WireGuard, "Do I turn this network allowed? When do I turn this on?"; "I still need to select the address … Yes or no … you know the different network environments more than me"; earlier "without encryption, people feel scared" (copy)
- IDs affected: REQ-002 (VPN rank, never select), REQ-004 (once per network, calm copy, "Not now" state), DEC-004 settled, DEC-013 new; U-004, U-005 added
- Approval impact: all decisions settled; requirements approval follows his confirmation of the design
- Sent to the Product Team the same day

### SR-005a — Platform priority (factual addition within SR-005)

- The user, 2026-11-07: "The majority of the users are on Mac and Linux … Windows is very low priority." Recorded as QR-006: macOS and Linux verified; Windows gets the safe fallbacks only. No behavior change.

### SR-006 — Wi-Fi permission and a different address are alternatives, shown only when needed

- Trigger: the user, 2026-11-07: "what is the relationship between local Wi-Fi allowed and enter an address by hand? … do I have to do two both at the same time?"
- IDs affected: REQ-007 wording, REQ-020 new, DEC-014 new (Solution Designer at the user's standing word)
- Sent to the Product Team the same day

### SR-007 — "How does this work?" section

- Trigger: the user, 2026-11-07: "do we need a separate section … to explain how everything works? … hidden, but you look and open it"
- IDs affected: REQ-021 new (Solution Designer within his direction); sent to the Product Team the same day

### SR-008 — "How does this work?" by network type

- Trigger: the user, 2026-11-07: "separate section for each types, make it more detailed because the user really care about this, so they feel more secure … I think you should prepare the text"; also his question on what "company's address" means (wording changed to "an address set up for this node")
- IDs affected: REQ-021; text sent to the Product Team the same day
