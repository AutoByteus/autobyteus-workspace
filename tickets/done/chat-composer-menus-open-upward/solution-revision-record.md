# Solution Revision Record — chat-composer-menus-open-upward

## Revision Index

| SR | Date | Type | Requirements status | Design status | Route |
| --- | --- | --- | --- | --- | --- |
| SR-001 | 2026-09-30 | Requirements baseline (draft) | Draft | N/A | Product Design Requested → `/product_team/product_prototyper` |
| SR-002 | 2026-09-30 | Requirements (Product integration) | Ready for Approval | N/A | Routine approval hold with the user (no handoff) |
| SR-003 | 2026-09-30 | Requirements approval | Approved | N/A | Architecture design started |
| SR-004 | 2026-09-30 | Design | Approved (SR-003) | Architecture Design Complete (Small / Low) | Direct implementation → `/software_engineering_team/implementation_engineer` |

## Revision Entries

### SR-001 — Draft baseline and Product Design request

- Trigger: User chat request 2026-09-30 + screenshot.
- Prior result: N/A.
- Current status: Requirements Draft; design not started.
- Affected IDs: SCN-001–004, BEH-001–004, REQ-001–004, AC-001–005, OQ-001–003.
- Canonical sections: all of `requirements-doc.md` and `investigation-notes.md` (new).
- Approval basis/impact: No approval yet. User asked for Product Prototyper to fix the UI first.
- Design/review/routing impact: Product Design Requested (New Request).
- Remaining gaps: OQ-001–003, Product UI result, user approval.

### SR-002 — Integrate user-confirmed Product UI/UX result; Ready for Approval

- Trigger: Product Prototyper `Prototype Completed` (prototype `personal@d0c39a5`, integration `df1377c`), user-confirmed 2026-09-30.
- Prior status: Draft (SR-001). Current status: Ready for Approval; design N/A.
- Affected IDs: BEH-001–003; REQ-001–004 (made concrete); AC-001–005 (tied to VIS-*); OQ-001–003 closed as DEC-002–004; DEC-001 added.
- Canonical sections changed: requirements Document Status, behavior table, Requirements, Acceptance Criteria, Decisions (Open Questions removed); investigation notes Product findings and supplement inventory.
- Intended behavior changed: No new scope. The open questions were answered within the requested behavior.
- Approval impact: UI/UX supplement user-confirmed. Explicit requirements approval requested from the user.
- Design/review/routing impact: none until approval.
- Remaining gaps: user approval.

### SR-003 — Requirements approval

- Trigger: The user replied "approve" in the Solution Designer chat on 2026-09-30.
- Prior status: Ready for Approval (SR-002). Current status: **Approved**, baseline SR-002 content (REQ-001–004, AC-001–005, DEC-001–004) + user-confirmed Product UI/UX spec.
- Canonical sections changed: requirements Document Status only.
- Intended behavior changed: No.
- Design impact: architecture design may start.

### SR-004 — Architecture design complete

- Trigger: Architecture investigation on the approved SR-003 basis.
- Prior status: Requirements Approved; design not started. Current status: `design-spec.md` Architecture Design Complete; `task_size=Small`, `architectural_risk=Low`.
- Affected IDs: all REQ/AC via the behavior/production-path map.
- Key decisions: opt-in `'above'` placement policy in `useAnchoredPopover`, measured from the menu's containing block; `auto` preserved for `useSkillTagMenu`; Model flyout bottom-aligned with `flyoutOffset` removed; new-chat padding `pt-[14vh] pb-10`.
- Approval impact: none (no intended-behavior change).
- Review/routing impact: Small/Low → direct implementation (no independent architecture review) per handoff rules.
- Remaining gaps: none. `docs/chat.md:91` padding note is left for Delivery docs sync.
