# Solution Revision Record — mobile-experience-redesign (autobyteus-277)

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline for the Product brief | N/A | N/A | Draft | REQ-001…REQ-009, DEC-001…DEC-006 | Product Design Requested |
| SR-002 | Requirements | Product Design Completed, user-approved (design rev `16678d53`) | Product findings 1–7 | Draft | Approved | All REQ/AC; REQ-010 added; DEC-003 A, DEC-004, DEC-007, DEC-008 | Requirements approved |
| SR-003 | Mixed | The user dropped the optional marker (design rev `976457a4`); architecture design | — | Approved (SR-002) | Approved; design Ready | REQ-010, AC-010 removed; AC-006 wording; DS-001…DS-009 | Architecture Design Complete (Large, High) |
| SR-004 | Design | ARCH-REV-001 round 1 (Fail, Design Impact) | AR-001…AR-008, MP-001…MP-003 | Design Ready (SR-003) | Design Ready (revised) | REQ-003, REQ-005, REQ-006 paths (DS-003, DS-004); no requirement change | Architecture Design Complete (Large, High), re-review |
| SR-005 | Mixed (in progress) | API-REV-001 Fail; CRR-003 failure-origin review | F-01…F-09 | Requirements Approved (SR-003); design Ready (SR-004) | Requirements Ready for Approval; design Needs Revision | REQ-002a, REQ-003a, REQ-011; AC-002a, AC-003a, AC-011; DEC-009…DEC-014 | Waiting for the user's DEC-009…DEC-011 |

## Revision Entries

### SR-001 — Requirements baseline and Product brief

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Task autobyteus-277 and the user's comment of 2026-11-06 ("delegate a task to product team").
- Triggering finding IDs: N/A.
- Prior status: N/A.
- Current status: requirements `Draft`; design not started.
- IDs affected: BEH-001…BEH-006, UC-001…UC-006, REQ-001…REQ-009, AC-001…AC-010, SCN-001…SCN-006, DEC-001…DEC-006.
- Scenario basis: SCN-001…SCN-005 Supported Normal; SCN-006 Unclear until DEC-003.
- Why recorded: the first coherent baseline, used for the Product Team's brief.
- Canonical sections: all of `requirements-doc.md`, `investigation-notes.md`.
- Supplements: `product-design-request.md` added.
- Product evidence incorporated: none yet.
- Intended behavior changed: N/A (baseline).
- Approval impact: none yet. DEC-001, DEC-002, DEC-005, DEC-006 decided by the Solution Designer within the direction; DEC-003 and DEC-004 need the user.
- Supplement versions: N/A.
- Design/review basis: N/A.
- Classification: N/A before design.
- Handoff: Product Design Requested → `/product_team` (the user named the Product Team), see `product-design-request.md`.
- Downstream impact: none yet.
- Remaining gaps: Product design and its user confirmation; DEC-003; DEC-004; U-003 feasibility; R-001, R-002.
- Next action: integrate the Product Team's confirmed result, then approve requirements and design the architecture.
- Applied handoff (2026-11-06): `delegate_task` to `/product_team` (the user named it; no handoff rule covers Product). Team run `product_team_9bdbc85721724c2b83e73471b800bb15`, coordinator run `product_ui_ux_designer_3cebbd3c0cf74d4c876c9e9a88197fd8`. No Task id (this is part of the delegated Task autobyteus-277).

### SR-002 — The approved Product design integrated; requirements approved

- **Phase and classification:** Requirements, `Refinement`.
- **Trigger:** the Product UI/UX Designer's `Design Completed`, approved by the user (2026-11-06): "okayyy. everything is good now. i approve".
  - Design revision `16678d531b1e1f4f6a2a030d62d9c9e2f9b6a218`.
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design-worktrees/mobile-experience-redesign/tickets/in-progress/mobile-experience-redesign/ui-ux-spec.md`.
- **Triggering finding IDs:** Product findings for engineering 1–7.
- **Prior status:** requirements `Draft` (SR-001).
- **Current status:** requirements `Approved`.
- **IDs affected:**
  - REQ-001…REQ-009 rewritten to the approved design.
  - REQ-010 added: the optional marker, conditional.
  - AC-001…AC-011; BEH-007 added; SCN-001…SCN-006 mapped to UXJ-001…UXJ-008.
  - Decisions:
    - DEC-003: A, as built and approved;
    - DEC-004: the user's "What Is Not On The Phone";
    - DEC-005: optional;
    - DEC-007: agent-only New run, the user's words;
    - DEC-008: no row actions.
- **Scenario changes:** SCN-006 is now Supported Normal (option A).
- **Sections changed:** all of `requirements-doc.md`; `investigation-notes.md` Product Design Findings and the supplement inventory.
- **Supplements:** the Product spec and VIS-001…029, approved.
- **Product decisions incorporated:** DEC-003 A, DEC-004, DEC-007, the five findings.
- **Intended behavior changed:** `Yes`, defined by the user's approved design.
- **Approval:**
  - the user, through the approved design and his words for DEC-004 and DEC-007;
  - the Solution Designer within that direction, for DEC-003 as built;
  - the user informed in the Solution Designer's result.
- **Design basis:** N/A before SR-003.
- **Next action:** architecture design.

### SR-003 — The optional marker dropped by the user; architecture design complete

- **Phase and classification:** Mixed, `Refinement` (requirements) and `Initial Baseline` (design).
- **Trigger:** the Product UI/UX Designer's update after the approval. Design revision `976457a418d6355296c8a366bf403c865ee0646c` (Product round 17); VIS-001, 002, 003, 004, 024 and 025 retaken. The user's words: "I suggest that don't like hallucinate and invent things up, remove those, please, thanks a lot. Remove those. Those are not possible in the application, I think."
- **Triggering finding IDs:** none. Architecture evidence E-10…E-27.
- **Prior status:** requirements `Approved` (SR-002); no design yet.
- **Current status:** requirements `Approved` (SR-003); design `Ready`.
- **IDs affected:**
  - REQ-010 and AC-010 removed; the former AC-011 is now AC-010.
  - DEC-005 is Dropped (the user).
  - AC-006's wording: "+" is on the list only.
  - FU-002 (proposed in this round's draft, never sent) withdrawn, because the user dropped the idea.
  - Design spines DS-001…DS-009.
- **Sections changed:**
  - `requirements-doc.md`: Status, Requirements, AC, Scenarios, Supplements, Decisions, Traceability, Architecture Phase Input.
  - `investigation-notes.md`: Architecture Investigation Findings E-10…E-27, Product findings, U-003 closed.
  - `design-spec.md`: new.
  - `follow-ups.md`: FU-001 only.
- **Supplements:** the Product spec at `976457a4`.
- **Intended behavior changed:** `Yes`, by removal of an optional element, at the user's request.
- **Approval:** the user (his words above).
- **Design:** `design-spec.md`. Shared owners are reused or extended; the phone's own model is removed.
- **Classification:** `task_size = Large`; `architectural_risk = High`. Shared owners changed, a desktop blast radius, ownership moved (see design-spec).
- **Handoff:** `Architecture Design Complete` → `/software_engineering_team/architecture_reviewer`. Result file: `solution-handoff.md`.
- **Remaining gaps:** none blocking. R-001 and R-002 are verified on device.
- **Next action:** independent architecture review.

### SR-004 — Design revised for ARCH-REV-001

- **Phase and classification:** Design, `Design Impact`.
- **Trigger:** architecture review `ARCH-REV-001`, round 1: `Fail`, findings AR-001…AR-008. Report: `design-review-report.md`.
- **Triggering finding IDs:** AR-001 (High), AR-002, AR-003 (Medium), AR-004…AR-008 (Low); premises MP-001, MP-002, MP-003.
- **Prior status:** requirements `Approved` (SR-003); design `Ready` (SR-003).
- **Current status:** requirements unchanged and approved (SR-003); design `Ready` (SR-004).
- **IDs affected:** design paths for REQ-003, REQ-005 and REQ-006 (DS-003, DS-004, the run-screen and pending-open bounded spines). No requirement, AC or decision changed.
- **Design changes:**
  - **AR-001:** `mobileRunOpeningStore` owns the pending open. The order is: begin → push `screen=run` → shared action → commit or fail. The run screen shows "Opening…" while an open is pending. A failed open returns to the list, as the desktop leaves its view unchanged. The Team stream-recovery case shows the desktop's existing toast. `reopenSelected` is removed.
  - **AR-002:** `useMobileNavigation` is the only `/mobile` writer, Org keys included, using the pure `agentOrgRouteQuery`. The mobile subject action does no navigation. No shared → phone import; no mobile `stop` branch.
  - **AR-003:** `openRun` writes the subject's Org keys onto the list entry too. The disclosure takes `useRouteSelectedAgentOrg` (extracted from two desktop copies) and `hasSelectedChild` from the collaboration store.
  - **AR-004:** `defaultExpansion` folds Org task teams on the phone.
  - **AR-005:** the display-name rule is stated per kind.
  - **AR-006:** `onOpenAgentRun` has one owner.
  - **AR-007:** the callers, contracts and types are listed at their call sites. `onCreateRun` moves to its only caller.
  - **AR-008:** the load composable returns its read result, and the 401 rule observes it.
  - **Residual:** `useAgentRunCollaborationSync` moves to the paired shell.
- **Sections changed:**
  - `design-spec.md`: Solution basis, new section "Revision For ARCH-REV-001", Task Size text, Change Scope, DS-003/DS-004 rows and spines, narratives, Ownership Map, Bounded Local Spines, Off-Spine, Ownership Boundaries, Boundary Map, Dependency Rules, Interface Mapping and Check, File Mapping, Examples, Sequence, Tradeoffs, Guidance.
  - `investigation-notes.md`: E-28…E-32.
- **Intended behavior changed:** `No`. A failed open returning to the list uses an approved state (the list) and no new copy.
- **Approval impact:** none. The requirements approval at SR-003 stands.
- **Classification:** unchanged, `Large`, `High`.
- **Handoff:** `Architecture Design Complete` (revised) → `/software_engineering_team/architecture_reviewer` for the scoped re-review (DS-003, DS-004, the run-screen spine, AR-001…AR-008).
- **Remaining gaps:** none. The Product spec's cosmetic slips are the Product Team's; they were sent to the Product UI/UX Designer.
- **Evidence-only note (2026-11-06, after the round-2 handoff):** the Product UI/UX Designer fixed the two cosmetic slips in the spec at design revision `e6ca7b6098b8bee1d194ad9cc0292c8e88ef59a6`, which changes only spec text over `976457a4`. The requirements and design now pin that revision. No intended behavior, design or approval change.
- **Architecture review result (2026-11-06):** `ARCH-REV-002`, `Pass`, on SR-003 (requirements) and SR-004 (design), package commit `407f0ee8e9`, Product spec `e6ca7b6098`. AR-001…AR-008 are resolved. The reviewer handed the package to `/software_engineering_team/implementation_engineer`; this pass is informational and is not forwarded again.
  - Non-blocking points passed to implementation: the commit-attribution window of a pending open; the list entry left rewritten after a failed open; the source of the Org `mode` key on the phone.
  - Editorial fixes in `design-spec.md` after the pass: the evidence range, E-19's decision, the Split sequence line and the DS-009 mount point now read SR-004's design. Text only; no design change.

### SR-005 — In progress: CRR-003 findings (waits for the user)

- **Phase and classification:**
  - Mixed: `Requirement Gap` (F-06 member lines, F-07, F-09) and `Design Impact` (F-01, F-06 source, F-08).
  - F-02 is a Local Fix with a Change Scope extension.
- **Trigger:** API/E2E round 1, `API-REV-001` Fail (`api-e2e-execution-coverage-report.md`), and the code reviewer's failure-origin review `CRR-003` (`code-review-report.md`).
- **Prior status:** requirements `Approved` (SR-003); design `Ready` (SR-004, ARCH-REV-002 Pass).
- **Current status:**
  - requirements `Ready for Approval` for the proposed REQ-002a, REQ-011, AC-002a and AC-011;
  - REQ-003a and AC-003a are a clarification within the direction;
  - design `Needs Revision`, with a draft section in design-spec.
- **Decisions:**
  - DEC-009, DEC-010 and DEC-011 are `Needs user`, asked in the Solution Designer's result of 2026-11-06.
  - DEC-012, DEC-013 and DEC-014 are decided by the Solution Designer within the direction.
- **Evidence:** E-33…E-37.
- **Follow-ups:** FU-007 (desktop staleness).
- **Next action:** the user's answers. Then finish SR-005 and route it to architecture review (Large / High), then implementation, with the local fixes F-03…F-05 and the `TESTING.md` rule for API/E2E.
