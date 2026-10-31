# Solution Revision Record — projects-left-navigation

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Task autobyteus-347 | N/A | N/A | Ready for Approval | BEH-001…008, REQ-001…015, AC-001…013, DEC-001…011 | Presented to the user with DEC-001…003 |
| SR-002 | Requirements | User answers 2026-10-31 | N/A | Ready for Approval | Approved | REQ-002…008, 014; DEC-001…003, 012, 013 | Any agent under a Project; folder rule; approved |
| SR-003 | Requirements | User asks for Product Design first | N/A | Approved | Approved (Product Design Requested) | DEC-008 | Request sent to /product_team |
| SR-004 | Requirements | Product review: user wants a Project choice in New chat | Product interim Requirement Impact | Approved R2 | Approved R3 | REQ-004, 005; BEH-002, 005; SCN-011; AC-015; DEC-014 | Accepted

## Revision Entries

### SR-001 — Initial requirements baseline

- Phase and classification: Requirements, Initial Baseline.
- Trigger: Task autobyteus-347 delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), replacing autobyteus-72.
- Triggering finding IDs: N/A.
- Prior status: N/A (autobyteus-72's R2 Draft is historical input only, never approved: `/Users/normy/autobyteus_org/autobyteus-delivery-records/project-centric-execution-72-20261031/`).
- Current status: requirements Ready for Approval; design not started.
- IDs affected: all (baseline).
- Scenario basis: SCN-001…SCN-010 (new Projects-mode scenarios SCN-002, SCN-006 proposed).
- Why recorded: first coherent baseline for the user's approval.
- Canonical sections: whole requirements-doc.md and investigation-notes.md.
- Supplements: evidence/intake screenshot; follow-ups.md (FU-001…003).
- Product design evidence: none (DEC-008).
- Intended behavior changed: N/A (baseline). Differences from autobyteus-72's draft, from new evidence: manager folder recommendation changed to the Project's linked folder (E-007, E-008, E-016); existing managers are derived from Task records and may serve several Projects (E-017) instead of "one Project per manager conversation"; the left list shows Tasks with work, not all Tasks (E-016, E-018); automatic archive settled as existing closure behavior (E-006); closed-history viewing moved to a follow-up.
- Approval impact: awaiting the user (DEC-001, DEC-002, DEC-003 Needs user).
- Behavior-defining supplements: none.
- Design/review basis: N/A.
- Post-design classification: N/A.
- Handoff: none (approval hold in the requirements conversation).
- Remaining gaps: user answers; U-003, U-004 for architecture.
- Next action: user approval, then architecture design.

### SR-002 — User journey and folder decisions; requirements approved

- Phase and classification: Requirements, Refinement (user change to intended behavior).
- Trigger: the user's answers of 2026-10-31 (quoted in requirements-doc.md § User Decisions).
- Prior status: Ready for Approval (SR-001). Current: Approved (R2).
- IDs affected: REQ-002…REQ-008, REQ-014 rewritten (any agent or team under a Project; Project tree like a workspace; no left Task list); DEC-001/002 decided by the user (first linked folder, else temp workspace; never mandatory); DEC-003 superseded; DEC-012, DEC-013 added; ACs renumbered AC-001…AC-014; SCN-002, SCN-006 updated.
- Intended behavior changed: Yes (by the user).
- Approval: User for the journey and folder rules; Solution Designer within the direction for DEC-004…DEC-011, DEC-013 (user informed in the conversation).
- Design/review basis: none yet; architecture investigation started (reading gate passed: architecture-design.md, design-principles.md, root DESIGN.md, Data Migration Guideline §1–4).
- Next action at the time: architecture design.

### SR-003 — Product Design requested by the user

- Phase and classification: Requirements, Refinement (process; no change to intended behavior).
- Trigger: the user, 2026-10-31: "i think we could first work on the UI? you can task @Product Team to work on the UI".
- Prior status: Approved R2, architecture in progress. Current: Approved R2; architecture paused until the Product result returns; DEC-008 overridden by the user.
- IDs affected: DEC-008 (now: Product Design requested by the user); UI section to be filled from the returned package.
- Supplements added: product-design-request.md.
- Approval impact: the returned UI/UX package needs the user's confirmation and integration into the requirements before the technical design is finalized.
- Handoff: `delegate_task` to `/product_team` (user-named collaborator); classification `Product Design Requested`, purpose New Request.
- Delegated: team run `product_team_2b0e32f1890d47c893b2b9d63b652374`, coordinator `product_ui_ux_designer_6f9b3db8fadd44c0ba67e6623a9e6091` (2026-10-31). No task_id returned (this work is part of autobyteus-347).
- Next action: wait for the Product Team's result; resume architecture with it.

### SR-004 — Project choice on the New chat start surface

- Phase and classification: Requirements, Requirement Gap (user change to intended behavior), raised by the Product UI/UX Designer (run `product_ui_ux_designer_6f9b3db8fadd44c0ba67e6623a9e6091`) as an interim Requirement Impact during the design review.
- Trigger: the user's words in the review, 2026-10-31: "does this mean in the chat area, i could also select project view? as well?" and "I guess it's better to add it right?"
- Prior status: Approved R2 (SR-002/003). Current: Approved R3.
- IDs affected: REQ-004 (second start path), REQ-005 (folder follows the chosen Project unless already picked), BEH-002, BEH-005, SCN-011 (new), AC-015 (new), DEC-014 (new), UI section.
- Intended behavior changed: Yes (by the user). Approval: the user's own words above; details (chip only when Projects exist, "No project", fixed after creation) decided by the Solution Designer within that direction.
- Design impact: technical design not yet written; the Project record and start path cover both entry points.
- Next action: reply to the Product UI/UX Designer that the addition is accepted; wait for the final Product package.
