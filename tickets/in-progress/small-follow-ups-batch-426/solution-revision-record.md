# Solution Revision Record — small-follow-ups-batch-426

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-426); the user's decision on item 15 | DEC-001…DEC-011 | N/A | Approved (round 1); round 2 Draft | BEH/REQ-001…018 | Round 1 approved within the direction; item 4 dropped (DEC-001); item 15 dropped (DEC-011, at the user's word); round 2 = items 9 and 16 after the Product text |
| SR-002 | Mixed | Round-1 architecture design | E-14 refined (no "check finished" field), A-05 | Approved / no design | Approved / design Ready | REQ-002 (wording: same points as the 401 rule), REQ-005 (one Clipboard sheet), REQ-008/AC-008 (desktop launch error; DEC-004 restore effect) | Design Ready; Medium / High (WebView navigation rule); route: architecture review |
| SR-003 | Mixed | Product Team result for item 16 (user-approved) | Product DEC-A, DEC-B | REQ-016 Draft (round 2) | REQ-016 Approved, in round 1; design D-16 | REQ-016, AC-016, UC-016, SCN-011, BEH-016 | Item 16 moved into round 1; round 2 = item 9 only |
| SR-004 | Design | ARCH-REV-001 Fail | AR-001, AR-002, AR-003 | design Ready (reviewed Fail) | design Ready (revised) | REQ-002/AC-003, REQ-016/AC-016; status lines | D-02 one outcome per check; D-16 explicit remote list + catalog spec; status lines to SR-004; focused re-review |
| SR-005 | Design | Implementation Design Impact (D-02), IMP-02 | A-07; E-14 correction | design Ready (ARCH-REV-002 Pass) | design Ready (D-02 revised) | REQ-002/AC-002, AC-003 | History store keeps the failed read's error object; refusal rule reads the Apollo shape; re-review of D-02 |
| SR-006 | Mixed | Task comment: item 19 (427 FU-001) from `/project_task_manager` | E-19 | REQ-019 absent | REQ-019 Approved, D-19 | REQ-019, AC-019, UC-019, SCN-014, BEH-019 | Item 19 joins round 1; branch must take in 427 first |

## Revision Entries

### SR-001 — Batch baseline, two rounds

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Project Task autobyteus-426 from `/project_task_manager` (the user's word, 2026-11-07); the user in this conversation, 2026-11-07: "did you send to product team? what is needed from the product team?", "only small ui update or?", "i trust your judgement, you have really good reasoning skill you understand my product very well as well"
- Triggering finding IDs: E-01…E-18 (investigation notes)
- Prior status: N/A
- Current status: requirements Approved for round 1 (REQ-001…003, 005…008, 010…014, 017, 018); REQ-009 and REQ-016 Draft (round 2); REQ-004 and REQ-015 dropped; design not yet written
- IDs affected: all BEH/REQ/AC of the batch; DEC-001…DEC-011
- Scenario basis: SCN-001…SCN-008, SCN-012, SCN-013 Supported Normal (round 1)
- Why recorded: first coherent baseline, used for the Product request and approval
- Canonical sections: requirements-doc (all), investigation-notes (all)
- Supplements: `product-design-request.md`, sent to `/product_team` (team run `product_team_33a7ded8781c478584c06df8b7edaaa5`, coordinator `product_ui_ux_designer_d715ce52737a4866830cce5a54095cc2`); then corrected: item 15 held, then dropped; item 16 only
- Product design evidence incorporated: none yet
- Intended behavior changed: N/A (baseline)
- Approval: round 1 approved by the Solution Designer within the direction, the user informed in this conversation on 2026-11-07. DEC-011 (drop item 15, against the Task's item 15 because of DESIGN.md rule 9) was brought to the user as `Needs user`; the user left it to the Solution Designer ("i trust your judgement"), which chose to drop it
- Supplement approval: N/A for round 1
- Design / review basis: none yet
- Classification: N/A before design
- Handoff: Product Design Requested (item 16, formerly 15 and 16) by `delegate_task` to `/product_team`; the Task names Product text first and the Product Team is the project's UI/UX owner (no configured handoff rule covers Product)
- Downstream impact: round 1 design starts; round 2 waits for the Product text
- Remaining gaps: U-01 (WebView copy), R-01 (AR-14 cause, reproduce first)
- Next action: round 1 design spec, classify, hand off

### SR-002 — Round-1 design

- Phase and classification: Mixed (`Refinement` of three requirement rows during design, within the approved intent; design baseline)
- Trigger: architecture investigation (A-01…A-06; E-14 refined: the runtime row exposes no "check finished" field; E-08 refined: the desktop New chat launch swallows registration errors into "could not be opened")
- Prior status: requirements Approved (SR-001), no design
- Current status: requirements Approved (round 1); design `Ready`
- IDs affected: REQ-002 (the revoked rule runs at the 401 rule's points: open, Retry, Check; the WebSocket-close mention removed, since the 401 rule never used it), AC-002 (poll removed); REQ-005 UI line (one "Clipboard" bar button and sheet instead of two buttons: no room in the phone bar); AC-008 and DEC-004 (desktop: the launch error shows the reason; a historical run whose workspace was removed and folder deleted opens without a workspace)
- Intended behavior changed: No material change. These rows make precise how the approved outcomes appear (same refusal points as the 401 rule, the place of the controls, the place of the desktop message); approval stays with the Solution Designer within the direction, the user informed in this conversation
- Design: `design-spec.md` D-01…D-18 (no D-04, D-09, D-15, D-16: dropped or round 2)
- Classification: task_size `Medium`, architectural_risk `High` (item 7 relaxes the Android WebView navigation containment next to the shell bridge; item 2 changes when the phone drops a credential); escalation triggers in the design spec
- Follow-ups: FU-001 (unused `diagnosticFromWebSocketClose`)
- Handoff: Architecture Design Complete → `/software_engineering_team/architecture_reviewer` (rule: Large or High); handoff file `handoff-architecture-design-complete.md`
- Remaining gaps: R-01, U-01 (handled in the design); round 2 waits for the Product text (item 16) and its own design (item 9)
- Next action: architecture review of round 1; round-2 requirements and design when the Product text returns

### SR-003 — Item 16's approved Product text joins round 1

- Phase and classification: Mixed (`Refinement`: the Product result integrated; design extended)
- Trigger: Product UI/UX Designer (`product_ui_ux_designer_d715ce52737a4866830cce5a54095cc2`), "Design Completed — autobyteus-426 item 16", 2026-11-07; spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/phone-setup-remote-node-wording/ui-ux-spec.md`; Product ticket closed and merged (design `personal` = `0341b3af`)
- Prior status: REQ-016 Draft (round 2)
- Current status: REQ-016 Approved (round 1), AC-016 added; design D-16 added; round 2 = item 9 only
- Product evidence verified: spec, 9 references VIS-001…009, runnable reference on the design repository's default branch, ticket record; user confirmation "approved" (2026-11-07) for DEC-A (wording) and DEC-B (How it works and allowed note)
- Product open points settled: (1) Read: the remote node keeps its own allowed answer (`phoneConnectionWays.ts:157`); (2) "Ready" unchanged; (3) key names and zh-CN are engineering's; (4) narrow render check in AC-016
- Intended behavior changed: Yes, REQ-016 now defined by the user-approved Product text (within the Task's item 16)
- Approval: the user (Product text); requirements row by the Solution Designer within the direction
- Classification: unchanged (Medium / High)
- Handoff: together with SR-002 → architecture review
- Product step: the Product Team ticket is closed; this delegation was made while working on the delegated Task autobyteus-426, so it has no Task of its own to close

### SR-004 — ARCH-REV-001 corrections

- Phase and classification: Design (`Design Impact` AR-001, AR-002) plus a documentation-consistency Requirement Gap (AR-003), no new approval needed
- Trigger: architecture reviewer (`architecture_reviewer_d40b29b15ce84a0290edd732f58a7e5e`), ARCH-REV-001 Fail, `design-review-report.md`
- AR-001: D-02 now records exactly one outcome per check through `recordCheckOutcome` (sets `phoneAccessOff` and `authorizedApiReachable` together; replaces `recordAuthorizedApiReachability`); session end clears `phoneAccessOff`. AC-003's alternate gains off → unreachable ("Can’t reach") and off → reachable (Connected)
- AR-002: D-16 selects the remote text by an explicit constant list `REMOTE_WORDED_PATHS`; a catalog spec requires en and zh-CN to define every listed remote key
- AR-003: requirements doc status/approval/baseline lines, DEC-002, Supplemental Artifacts, Readiness Check and the investigation notes brought to SR-004
- Residual notes RR-01…RR-03 recorded in the design spec (§ Review Residual Notes) as implementation guidance
- Intended behavior changed: No (AC-003's alternate makes the approved REQ-002 outcome explicit)
- Classification: unchanged (Medium / High)
- Handoff: focused re-review → `/software_engineering_team/architecture_reviewer`

- 2026-11-07: ARCH-REV-002 Pass on SR-004 (AR-001…AR-003 resolved); the reviewer handed round 1 to `/software_engineering_team/implementation_engineer` (informational; no forwarding by the Solution Designer). Report: `design-review-report.md`.

### SR-005 — D-02: the refusal reaches the check as the error object

- Phase and classification: Design (`Design Impact`), raised by the implementation engineer (`implementation_engineer_10ba4604bbe8483a9e7ca0f56aedabf8`) during implementation, 2026-11-07
- Finding: D-02's premise was wrong (A-07, measured): the refusal code never reaches `checkStatus`; the history store keeps only the Apollo message
- Decision: implementer's option (A), tightened: the history store keeps the thrown error as `historyReadFailure` beside its message, set and cleared together; `readHistory` returns it as `cause`; `remoteAccessReadRefusal` reads the Apollo `networkError` shape and the axios shape, keeping today's message fallback. Options (B) extra REST read and (C) code in the message text rejected
- Evidence correction: E-14 (`checkedAt` exists); D-14 updated to the implementer's `checkedAt` wait; R-01 resolved
- Design case: D-13's Case 5 text gains this premise mistake (trace an error through the real client library and every store that keeps it)
- Intended behavior changed: No
- Classification: unchanged (Medium / High); D-02 is on the High-risk spine, so architecture review repeats for D-02
- Handoff: Architecture Design Complete (revision) → `/software_engineering_team/architecture_reviewer`

- 2026-11-07: ARCH-REV-003 Pass on SR-005 (revised D-02); the reviewer handed round 1 to `/software_engineering_team/implementation_engineer` (informational, no forwarding). Its non-blocking note fixed: the DS-002 spine line now names `recordCheckOutcome` (editorial).

### SR-006 — Item 19 joins round 1

- Phase and classification: Mixed (`Refinement`: an item the delegator added to the Task)
- Trigger: `/project_task_manager` message and Task comment, 2026-11-07: item 19 from autobyteus-427 FU-001 ("file cannot be opened" status hidden on read-only conversations)
- Evidence: E-19 (Read on `origin/personal` `933163361c`)
- Requirements: REQ-019 / AC-019 / UC-019 / SCN-014 / BEH-019 added, approved by the Solution Designer within the direction (the Task comment's lead: show the status on read-only conversations too)
- Design: D-19 (move the status line out of the composer's read-only gate); the branch first takes in `origin/personal` (427 changed the same file)
- Intended behavior changed: Yes (new item, within the Task's direction)
- Classification: unchanged (Medium / High); D-19 is Low-risk UI; the package's review route still applies
- Handoff: revision → `/software_engineering_team/architecture_reviewer`

- 2026-11-07: ARCH-REV-004 Pass on SR-006 (D-19); routed to implementation by the reviewer (informational). Its repeated DS-002 note is already resolved: `design-spec.md:133` names `recordCheckOutcome`; no `recordPhoneAccessOff` remains in the design spec.
