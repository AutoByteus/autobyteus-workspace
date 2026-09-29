# Solution Revision Record — chat-composer-polish

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (user reports 1–3, 2026-09-29) | N/A | N/A | Ready for Approval | BEH-001–006, REQ-001–007, AC-001–009 | Presented to user for approval |
| SR-002 | Requirements | User delegated the aesthetic decisions to the designer | DEC-001–003 | Ready for Approval | Ready for Approval | REQ-001a, 002, 003, 004, 007, 008, 009; AC-001, 004, 005, 010 | Decisions resolved: B / Yes / 14vh→6vh; awaiting confirmation |
| SR-003 | Mixed | User approval ("go") + architecture design | N/A | Ready for Approval | Requirements Approved; Design Ready (Medium / Low) | All REQ/AC | Design complete; routed per handoff rules |
| SR-004 | Mixed | User verification feedback on the delivered build (screenshot 3) | REQ-007 / AC-009 | Approved (SR-003) | Ready for Approval (REQ-007 delta only) | REQ-007, AC-009, BEH-006, DEC-003 | Withdrawn: the user accepted the delivered 6vh position; requirements back to Approved (SR-003 basis + explicit agent-view preserve note) |

## Revision Entries

### SR-001 — Initial baseline: thinking auto-enable, workspace search, composer position

- Phase and classification: Requirements / Initial Baseline
- Trigger: User chat messages with screenshots 1 and 2 (thinking menu; workspace menu; composer too high)
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: Requirements Ready for Approval; design not started
- Affected IDs: BEH-001–006, REQ-001–007, AC-001–009, SCN-001–004, DEC-001–003
- Why recorded: First coherent baseline presented for approval
- Canonical sections changed: all (new)
- Supplements: none
- Intended behavior changed: Yes (new baseline)
- Approval impact: Pending explicit user approval; DEC-001–003 open
- Design/review basis: N/A
- Classification: N/A before design
- Handoff: None (approval hold)
- Remaining gaps: DEC-001–003
- Next action: Obtain user approval and decisions, then produce the design spec

### SR-002 — Designer-resolved UI decisions

- Phase and classification: Requirements / Refinement
- Trigger: The user replied "you have a really good front end aesthetic capability, you suggest for me" (2026-09-29)
- Triggering finding IDs: DEC-001, DEC-002, DEC-003
- Prior status: Ready for Approval (SR-001)
- Current status: Ready for Approval; waiting for the user's explicit go-ahead on the resolved choices
- Affected IDs: REQ-001a (new), REQ-002–004 (reworded), REQ-007 (made concrete), REQ-008 (new), REQ-009 (new), AC-001/004/005 (reworded), AC-010 (new)
- Changes: DEC-001 → B, a single merged "Thinking" list (Off · efforts) with the trigger showing the level and a muted bulb when off. DEC-002 → Yes, the run-config form auto-enables thinking. DEC-003 → 14vh → ~6vh bias, tuned at verification. Removed the merged-list non-goal from Out of Scope.
- Intended behavior changed: Yes (refines SR-001 before any approval)
- Approval impact: Explicit user confirmation still required
- Design/review basis: N/A
- Next action: User confirmation, then the design spec

### SR-003 — Approval and architecture design

- Phase and classification: Mixed / Initial design after approval
- Trigger: The user replied "go" in chat (2026-09-29)
- Prior status: Requirements Ready for Approval (SR-002)
- Current status: Requirements `Approved` (SR-002 content); design `Ready`
- Affected IDs: All REQ-001–009 (incl. 001a), AC-001–010
- Intended behavior changed: No (approval only)
- Approval impact: The approved baseline is SR-002 requirements content. Approval reference: "go", chat 2026-09-29
- Canonical sections changed: requirements-doc status/approval/decision rows; new design-spec.md
- Design: the adapter gains the dependent-edit invariant (`applyThinkingDependentEdit`, `getThinkingDependentParamKeys`); a pure `chatThinkingMenu.ts` merged-list model; `ModelConfigSection` Advanced interception; workspace search via `filterWorkspaceOptions`; `pb-[14vh]` → `pb-[6vh]`
- Classification: task_size `Medium`, architectural_risk `Low` (frontend-only, existing owners, no contract/persistence change)
- Handoff: see handoff-architecture-design-complete.md
- Remaining gaps: The composer offset will be fine-tuned during user verification. Server-side effort-while-off behavior is noted as out of scope
- Next action: Route per handoff rules

### SR-004 — Composer position revision from user verification

- Phase and classification: Mixed / user change to intended behavior (REQ-007 amount); Requirement Gap on the magnitude
- Trigger: During delivery user verification (handoff-summary.md, DR-001, pending), the user said: "the box on the chat page … it's like almost in the middle … maybe move it downward … On the Agent View page, you shouldn't move at all." Screenshot 3 shows the composer center at ~52% of the window height with the SR-003 `pb-[6vh]` build.
- Prior status: Requirements Approved (SR-003); implementation delivered, awaiting verification
- Current status: REQ-007 / AC-009 Ready for Approval; all other REQ/AC unchanged and still Approved
- Evidence: `git diff origin/personal` shows the only layout change is `ChatNewSurface.vue` (`/chat` with no run; `pages/chat.vue:3`). The agent/running view is not modified.
- Intended behavior changed: Yes (the magnitude of the move, plus an explicit preserved boundary for the agent view)
- Approval impact: Renewed user approval is required for the REQ-007 / AC-009 delta before the design revision is routed
- Design impact: `ChatNewSurface.vue` outer padding only (proposed `pt-[16vh] pb-0`, shifting the block ~8vh below center). The rest of the design is unchanged
- Next action: User approval, then a design-spec revision and routing per the handoff rules
- Outcome (2026-09-29): The user replied "Anyway, that's fine for now. No worry … I can accept that." The SR-004 proposal is withdrawn. REQ-007 / AC-009 keep the SR-003 approved 6vh basis, with a clarifying note that the agent/running view must not move (already true in the delivered diff). No design or implementation change; no handoff. The delivered build remains with the Delivery Engineer awaiting the user's explicit verification (handoff-summary.md, DR-001).
