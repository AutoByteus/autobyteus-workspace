# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user request 2026-10-07 | N/A | N/A | Ready for Approval | BEH-001..006, REQ-001..004, AC-001..005 | Presented to user with DEC-001..003 |
| SR-002 | Requirements | User refinement 2026-10-07: visible Draft rows under the Chat row | N/A | Ready for Approval (SR-001, not approved) | Ready for Approval | BEH-001/002/004/006/007, REQ-001..009, AC-001..008, DEC-001..005 | Replaces hidden-draft return with Draft rows; Chat/pencil always new |
| SR-003 | Mixed (Requirements + Product evidence) | Product Design Completed 2026-10-07 (run product_ui_ux_designer_d50f45957e0a45e4b7f23f1ce4e70a55) | N/A | Ready for Approval (SR-002) | Ready for Approval | BEH-004/005/007, REQ-001..011, AC-001..010, SCN-005, DEC-004/005, QR-001 | Integrated user-confirmed UI/UX spec; text-only draft rule; one-line rows |
| SR-004 | Requirements (approval) | User reply 2026-10-07 "no do not survide. no need" | N/A | Ready for Approval (SR-003) | Approved | REQ-011, AC-010, BEH-005, DEC-002 | Session-only drafts; requirements approved |
| SR-005 | Design | Architecture design after SR-004 approval | N/A | Requirements Approved; design N/A | Architecture Design Complete (Medium / Low) | REQ-001..011, AC-001..010 | design-spec.md Ready; direct implementation route |

## Revision Entries

### SR-001 — New chat draft kept when returning via the Chat item

- Phase and classification: Requirements — Initial Baseline
- Triggering user feedback: User report + screenshot (lost New chat input after navigating to another run)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001..006, REQ-001..004, AC-001..005, SCN-001..003, DEC-001..003
- Why recorded: First coherent baseline for user approval
- Canonical sections changed: All (new)
- Supplemental artifacts: None
- Intended behavior changed: Yes (proposed, BEH-001)
- Approval impact: Pending explicit user approval
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Remaining gaps: DEC-001..003 user choices
- Next action: Obtain user approval, then architecture design

### SR-002 — Visible Draft rows under the Chat row (user proposal)

- Phase and classification: Requirements — Refinement (user change to proposed intended behavior)
- Triggering user feedback: User, 2026-10-07: "create a draft ... directly under the chat row ... click that draft to enter ... the edit new chat is always starting a new chat"
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: SR-001 `Ready for Approval` (never approved)
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001/002/004/006 revised, BEH-007 added; REQ-001..009 rewritten; AC-001..008 rewritten; SCN-002/004 added/revised; DEC-001/003 superseded; DEC-004/005 added; DEC-002 recommendation changed to B
- Why recorded: User proposed a different, visible re-entry design
- Canonical sections changed: requirements-doc.md (all behavior, scope, REQ, AC, scenarios, UI, data continuity, decisions)
- Supplemental artifacts: None
- Intended behavior changed: Yes (proposed)
- Approval impact: SR-001 was never approved; SR-002 pending explicit user approval
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Remaining gaps: DEC-002, DEC-004, DEC-005 confirmation
- Next action: Obtain user approval, then architecture design

### SR-003 — Integrate the user-confirmed Draft-rows UI/UX spec

- Phase and classification: Mixed — Refinement (Product evidence + user-approved requirement wording)
- Triggering input: Product UI/UX Designer `Design Completed` 2026-10-07, package `chat-new-draft-kept-on-navigation`; spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/chat-new-draft-kept-on-navigation/ui-ux-spec.md` @ design `21643c2`, ticket closed `5e93a70`
- Triggering finding IDs: N/A
- Prior status: Requirements `Ready for Approval` (SR-002, not approved)
- Current status: Requirements `Ready for Approval`; design not started
- IDs affected: REQ-001 (typed text only), REQ-002 (one-line preview only), REQ-003 (selection rule), REQ-007 (no confirmation), REQ-008 ("Empty draft" until leaving), REQ-009 (multiple, new), REQ-010 (UI spec normative, new), REQ-011 (was REQ-009); AC-001..010 revised; SCN-005 added; QR-001 added; DEC-004/005 decided
- Product package verification: spec Status Approved with user-confirmation quotes; design repo/root, ticket, revisions (`21643c2`/`5e93a70`, base `eb60aba`, pin `10fb695` re-checked vs `cfeda548b`) agree between spec, product-ticket.md and the returned message; VIS-001..008 present; mock boundaries and permitted variations explicit. Result: consistent.
- Intended behavior changed: Yes (user-approved within Product review; overall SR-003 still needs explicit requirements approval)
- Approval impact: UI/UX spec user-confirmed 2026-10-07 ("i am satisfied. i confirm now"); SR-003 requirements approval pending; DEC-002 open
- Delegated Product task `ad_hoc_task_202460a7-c1af-4791-809a-be55a6b5079e` marked DONE after integration
- Affected design/review basis: N/A
- Remaining gaps: DEC-002; explicit approval of SR-003
- Next action: Obtain user approval, then architecture design

### SR-004 — Requirements approved; drafts are session-only

- Phase and classification: Requirements — Refinement + approval
- Triggering user feedback: 2026-10-07 "no do not survide. no need", replying to "Your answer is the last missing piece. Reply approved, B (or approved, A)"
- Prior status: Ready for Approval (SR-003)
- Current status: Requirements `Approved`; design in progress
- IDs affected: DEC-002 decided A; REQ-011, AC-010, BEH-005, Data Continuity updated
- Intended behavior changed: Yes (DEC-002 resolved)
- Approval impact: Approved baseline = SR-003 content + DEC-002 A; UI/UX spec @ 21643c2/5e93a70 included in the basis
- Next action: Architecture design

### SR-005 — Architecture design complete

- Phase and classification: Design — Initial design
- Trigger: Requirements approved (SR-004)
- Prior status: Requirements Approved; no design
- Current status: `design-spec.md` Ready; `Architecture Design Complete`
- IDs affected: all REQ/AC mapped to DS-001..DS-006
- Design highlights: `chatDraftStore` single draft → `drafts` + `openDraftId` (stable `ChatDraft.id`, store-owned `listed`); leave rule in `install()`; `openDraft`/`discardDraft`/`finishSentDraft`; per-draft model-choice generation; `useRunStart.openChatDraft`; new `useChatDraftRows` + `ChatDraftRows.vue`; `AppLeftPanel` placement/Chat row state/drawer close; composer keyed by draft id; launch success → `finishSentDraft`
- Design interpretation flagged to user: REQ-006 "failed send" = launch throws and the user stays on New chat; an agent first-send failure after the run is registered keeps today's presentation in that run and finishes the draft
- Intended behavior changed: No
- Persisted data: Not Affected
- Classification: task_size `Medium`, architectural_risk `Low` (frontend-only session state in existing owners; no API/persistence/security/deployment change)
- Applied handoff-rule outcome: see handoff-architecture-design-complete.md
- Remaining gaps: none blocking
- Next action: Implementation (direct route)
