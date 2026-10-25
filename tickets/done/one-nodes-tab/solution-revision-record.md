# Solution Revision Record — one-nodes-tab

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline | N/A | N/A | Ready for Approval | BEH-701…707, REQ-701…714, AC-701…713, DEC-701…708 | Four decisions put to the user |
| SR-002 | Requirements | User approval + clean UI sketch | N/A | Ready for Approval | Approved | DEC-701…704; UI section; ui-sketch.md rev 2 | Approved by the user; architecture starts |
| SR-003 | Design | Architecture design | N/A | Approved / no design | Approved / design Ready | DS-001…005; all REQ | Large / High; routed per handoff rules |
| SR-004 | Mixed | ARCH-REV-001 (Fail) | AR-001…AR-006 | Approved / Ready | Ready for Approval (DEC-709) / Needs Revision | DEC-709; BEH-701; AC-707; DS-002/003/004; naming, hint, identify | AR-002…006 resolved in design; AR-001 put to the user |
| SR-005 | Requirements | User: "lets first work on UI design, contact @Product Team" | N/A | Ready for Approval | Ready for Approval; UI pending Product package | UI section | Product Design requested |
| SR-006 | Mixed | Product package approved by the user; ARCH-REV-001 findings resolved | AR-001…006 | Ready for Approval / Needs Revision | Approved / Ready | BEH-701, 707; REQ-703, 704, 706, 710; AC-703; DEC-706, 707, 709; design DS-002/004, file mapping, removal | Round 2 of architecture review |
| SR-007 | Design | ARCH-REV-002 (Fail) | AR-007…AR-010 | Approved / Ready | Approved / Ready | Design only: run rules, duplicate check, B→A address source, stale statements | Round 3 of architecture review |

## Revision Entries

### SR-001 — Requirements baseline: one Nodes tab, one list keyed by node ID

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task Manager's Task (2026-10-22), the user's direction of 2026-10-21/22.
- Triggering finding IDs: N/A.
- Prior status: N/A. Current: requirements `Ready for Approval`; design not started.
- IDs affected: all listed in the index.
- Why recorded: first coherent baseline, used for the user's decisions and then the Product Team request.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` created.
- Supplements: none yet (Product UI/UX package to come).
- Intended behavior changed: N/A (baseline).
- Approval: pending the user's answers to DEC-701 … DEC-704.
- Design/review impact: N/A.
- Remaining gaps: user decisions; Product Team UI/UX package and its approval.
- Next action: the user answers; then Product Design request to `/product_team`.

### SR-002 — Approval and the clean UI basis

- Phase and classification: Requirements, `Refinement`.
- Trigger: the user, 2026-10-22: he asked for "a markdown based UI so I can have a look", then said "Just make the UI clean. If you think the UI is clean, then we can start working on it now."
- Prior status: Ready for Approval. Current: **Approved**. Design is now in progress.
- IDs affected: DEC-701 … DEC-704 approved as recommended; § UI, Interaction, And Experience Requirements now points at `ui-sketch.md` rev 2. No REQ or AC text changed.
- Supplements: `ui-sketch.md` rev 1 (exploratory) was replaced by rev 2 (clean): a per-row Agents switch, warnings only when needed, one fixing button, details in the expanded row, a ⋯ menu.
- Intended behavior changed: No; the UI form is now fixed.
- Approval: the user, reference quoted above, baseline SR-002. The Product Team round was not used at the user's request to start now.
- Design impact: architecture design starts on this basis.
- Remaining gaps: none for requirements.
- Next action: architecture design.

### SR-003 — Architecture design

- Phase and classification: Design, `Initial Baseline` of the design.
- Trigger: approved requirements SR-002; the user: "we can start working on it now".
- Prior status: requirements Approved, no design. Current: design `Ready`.
- IDs affected: design spines DS-001 … DS-005 cover REQ-701 … REQ-714. No requirement changed.
- Investigation: architecture findings added (fetch error shapes measured, container marker, resolver, registry, dead probe fields).
- Supplements: `evidence/probes/`; `follow-ups.md` (FU-001, FU-002).
- Intended behavior changed: No. Two design-level decisions are within the approved direction: `resolvePeerAddress` works with the switch off (it only reads public identity endpoints, and adding still needs the switch); and peer names for rows whose desktop name is invalid are derived (shown in the confirmation).
- Classification: `task_size` Large, `architectural_risk` High (GraphQL contract, persisted desktop registry shape without migration, two-node coordination).
- Next action: handoff per the rules (architecture review expected for Large/High).
- Applied handoff rule: Large/High → `/software_engineering_team/architecture_reviewer`, delivered 2026-10-22 (`handoff-architecture-review.md`).

### SR-004 — Architecture review round 1 findings

- Phase and classification: Mixed. AR-001 is a `Requirement Gap`; AR-002 … AR-006 are `Design Impact`.
- Trigger: ARCH-REV-001 (`design-review-report.md`), result Fail; the classification Large / High was confirmed.
- Prior status: requirements Approved (SR-002), design Ready (SR-003). Current: requirements `Ready for Approval` (only DEC-709 is new); design `Needs Revision` until DEC-709 is answered.
- Changes:
  - **AR-001:** new DEC-709 (switch off and address resolution) put to the user, recommending (b), strict off. The design is written for (b) (§ Switch-Off Rule), with the changes needed for (a) listed.
  - **AR-002:** § Naming Rule. Name source, valid derivation, uniqueness against the written side's peers with a numeric suffix, the run-time race re-plans. The sketch §5 shows names.
  - **AR-003:** `identify` replaces a differing ID (the window probe of the entry's own address is authoritative). Entries with the same ID: the first created is used.
  - **AR-004:** add keeps today's behavior. An unreachable node is added without an ID, and the cause is shown as information. BEH-701's preserved column is reconciled: the capability probe's role is kept by the identity probe and the dot; its unused stored fields go.
  - **AR-005:** this node is written only through `remoteCollaborationStore` and the capability store, desktop entries through `nodeStore`, and the other node through `nodeCollaborationApi`. `peerNodeAvailability` goes through `RemoteNodeDiscovery`.
  - **AR-006:** § Loopback Hint Surface. The hint appears only for a containerized node's failed resolution with a loopback first address, in the plan result and in Change address. "Use this" retries the resolution and never edits the desktop entry. AC-707's Given is refined (intended behavior unchanged).
  - Residual notes from the review are added: window probes while off; duplicate desktop entries.
- Intended behavior changed: only if the user picks DEC-709 (a) or (b): (b) keeps the current meaning of off; (a) would loosen it. Everything else is clarification within the approved intent.
- Approval impact: DEC-709 needs the user. The SR-002 approval stands for the rest.
- Next action: the user's DEC-709 answer, then the design goes to `Ready`, and back to the architecture reviewer for round 2.

### SR-005 — Product Team UI design requested

- Phase and classification: Requirements, `Refinement` (the UI authority changes).
- Trigger: the user, 2026-10-22: "lets first work on UI design, contact @Product Team please". He had asked how the flow works: add 8003 in the embedded window, turn on Agents, see 8003's Agents and Teams without opening 8003's window.
- Status: requirements `Ready for Approval` (DEC-709 still open). The UI is now pending the Product Team's package, which will replace `ui-sketch.md` rev 3 as the UI authority once the user approves it. The sketch remains input. Design: `Needs Revision`, waiting for the Product package and DEC-709.
- Open questions passed to Product, for the user: show a reachable node's agents before the switch is on? DEC-709's confirmation line; how a partial result looks.
- Route: `delegate_task` to `/product_team` (team `product_team_1dea39c6b6204a4a9c153a352daa460e`, coordinator `product_ui_ux_designer_c409f6b103144ff7b0659f1ad09b293a`); `handoff-product-design.md`.
- Architecture review round 2: after the Product package and DEC-709 are integrated.

### SR-006 — Product UI/UX package integrated; review findings closed

- Phase and classification: Mixed (`Refinement` of requirements through the user-approved Product package; `Design Impact` resolutions).
- Trigger: the Product Team returned `one-nodes-tab`. The user approved it: "i think we are ready. approved", 2026-10-23, after 8 review rounds. Package: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md`, VIS-001…031, design repo `personal` @ `feed5c653e…` (result `371e2ef0…`).
- Verification of the package: the spec links the runnable reference (repository root, runbook § one-nodes-tab) and the 31 final screenshots. The spec, `product-ticket.md` and the handoff name the same repository, ticket, commits and paths. The user's confirmation is quoted, and the mocked boundaries are explicit. VIS-003 and VIS-019 were inspected.
- Requirement impacts (decided by the user in the Product review), applied:
  - REQ-704 / DEC-707 / BEH-701: collaboration is on by default in the add form, always confirmed once.
  - Adding no longer opens the node's window.
  - REQ-710: Remove also removes this node from the other node when it can be reached.
  - REQ-703 / BEH-707: Agents and Teams show only once collaboration is on.
  - DEC-706: Open for a peer-only row, with the first Open adding a desktop entry.
  - REQ-706: the row line kinds, including "registered only by the other node".
  - The wording is "remote collaboration", with no "peer".
  - Naming as in the design.
- DEC-709: decided (b). The user delegated it ("you decide"); it matches the Solution Designer's recommendation.
- Note against the Task text: the Task said collaboration stays "OFF-by-default … adding a node to the list must not silently open it to agents". The user changed the add form's default to on. Nothing is opened silently: the confirmation lists every change and is required (QR-702). This node's own switch stays off by default.
- Design changes:
  - DS-002: no window open; duplicates by address or ID; unreachable means no confirmation.
  - DS-004: the window reads B's peers for non-collaborating rows. A peer-only row's reachability comes from this node's server (the Product risk).
  - § Product Package Mapping added.
  - Components renamed to the spec's set (`AddNodePanel`, `NodeRow`, `NodeConnectionDetails`, `NodeChangeDialog`, `NodeAddressHint`, `RemoteCollaborationIcon`); the 267 disclosure gains a slot.
  - Localization `nodesPage.ts`.
  - Removal of `addRemoteNode`'s `openNodeWindow`.
  - AR-001 … AR-006 resolved as in SR-004, with (b) now final.
- Status: requirements `Approved` (SR-006); design `Ready`. Classification unchanged: Large / High.
- Supplements: Product package (external, linked); `ui-sketch.md` superseded (history).
- Next action: architecture review round 2 (`handoff-architecture-review.md`, round 2 section).
- Applied handoff rule: Large/High → `/software_engineering_team/architecture_reviewer`, round 2, delivered 2026-10-23.

### SR-007 — Architecture review round 2 findings

- Phase and classification: Design, `Design Impact` (all four findings); no requirement changed.
- Trigger: ARCH-REV-002 (`design-review-report.md`): Fail; AR-001 … AR-006 confirmed resolved; the Product mapping confirmed sound.
- Changes:
  - **AR-007:** new § Run Rules, one rule per plan kind. `connect`/`finish` stop at the first failure; `disconnect` continues; `remove` always reaches `removeFromList` and reports a failed `removeThere` ("Removed here. X could not be reached…"); `rename` stops (both names unchanged); `changeAddress` stops. The connector test is listed.
  - **AR-008:** DS-002 checks the typed address against every row's window address on submit, whatever the node's state, and the node ID when the probe answers. Guidance test added.
  - **AR-009:** the source of the address the other node uses for this node is B's `peers`, read by the window for every row it can reach (one read gives both "has this node" and the address). `peerNodeAvailability` is unchanged.
  - **AR-010:**
    - requirements Document Status (baseline SR-006, the Product package as the UI basis, both approval references) and Readiness updated;
    - design spec baseline line, `resolvePeerAddress` row (decided (b)), Key Tradeoffs, the DS-003 spine (write paths per AR-005), `NodeChangeStep` (`resolveHere`/`resolveThere`, `renameInList`) and plan kinds (`finish`, `rename`), Guidance (the spec's states) and the hint wording updated.
  - **Residual note:** a peer-only row with this node's switch off shows "Off on this node" (§ Window Probes While The Switch Is Off).
- Intended behavior changed: No.
- Status: requirements Approved (SR-006); design Ready. Classification unchanged (Large / High).
- Next action: architecture review round 3 (AR-007 … AR-010 only).
- Applied handoff rule: Large/High → `/software_engineering_team/architecture_reviewer`, round 3, delivered 2026-10-23.
- ARCH-REV-003: **Pass** (2026-10-23). All ten findings are closed. Recorded as informational; the reviewer handed off to `/software_engineering_team/implementation_engineer`, so I did not forward it again. A factual correction after the pass: the Guidance rename bullet now matches § Run Rules (peer first, stop on failure), as the reviewer's note says. No design change.
