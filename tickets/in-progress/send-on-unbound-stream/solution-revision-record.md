# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-540 (533 FU-006); investigation and measurement | N/A | N/A | Approved (Solution Designer within the direction; user informed) | BEH-001…007; REQ-001…006; AC-001…007 | Baseline with reproduced root cause |
| SR-002 | Mixed | Design: the Team/Org in-flight case cannot be decided after a rebind; clear-on-edit would need draft watching | N/A | Approved (SR-001) | Requirements Approved (refined); design Ready | REQ-004, AC-004, DEC-005 | Two notice texts, dismiss instead of clear-on-edit; design spec written; Medium / High |
| SR-003 | Mixed | ARCH-REV-001 (Fail, Design Impact) | AR-001 | Requirements Approved (SR-002); design Ready; review Fail | Requirements Approved (refined); design Ready (revised) | REQ-002, REQ-004 (b), AC-003, DEC-006; D-3, D-8 | The snapshot carries the active run's input state; "unknown" where the node cannot tell |

## Revision Entries

### SR-001 — Requirements baseline: no message lost without a word

- Classification: Initial Baseline. Trigger: Task autobyteus-540 from `/project_task_manager`.
- IDs: BEH-001…007, UC-001…004, REQ-001…006, AC-001…007, SCN-001…003, DEC-001…004.
- Intended behavior changed: Yes. Approval: Solution Designer within the direction; user informed in the Solution Designer's conversation, 2026-11-18.
- Next action: design.

### SR-002 — Honest notice texts; design complete

- Classification: Refinement + Design. Trigger: designing D-5 showed the Team and Org routes cannot tell after a loss whether the node had the message; REQ-004's single "not sent" text would then be false; clearing on edit needed a draft watcher for no gain.
- Changed: REQ-004 (texts (a) known not sent and (b) unknown; dismiss button), AC-004, DEC-005 added; design-spec.md created; follow-ups.md (FU-001); `evidence/spine-validation/sr-002-send-spines-by-run-kind.md`.
- Intended behavior changed: No (refinement within the same direction). Approval impact: none beyond SR-001.
- Classification: task_size Medium, architectural_risk High.
- Handoff: `handoff-architecture-design-complete.md` → `/architecture_reviewer`.
- Next action: architecture review.

### SR-003 — Queued input in the reconnect snapshot (ARCH-REV-001 AR-001)

- Classification: `Design Impact` with a requirements refinement. Trigger: ARCH-REV-001 Fail, AR-001 (and MP-001): D-3 assumed the snapshot carries queued input; native/AGY/ACP queue input while a turn runs, so a queued message lost in flight would have been reported "not sent".
- Changed: requirements REQ-002 (where queued input comes from; text (b) where the node cannot tell), REQ-004 (b), AC-003, DEC-006; design D-3 revised, D-8 added (node: `input_state` in the active run's snapshot; peer and stopped: `null`), evidence rows, DS-002, return spine, examples, file mapping, derived consumers, risks R-1 (ASM-001 supported) and R-4, sequence step 1 (queued-case unit, server snapshot unit, shape updates); citation corrected (`runProjectionConversation.ts:100`); investigation-notes.md rows; `evidence/spine-validation/sr-003-send-spines-by-run-kind.md` (SR-002 re-walk marked superseded); `docs/design-cases.md` Case 5 (this ticket).
- Intended behavior changed: refinement within the same direction (a message the node holds is never reported not sent; an honest "cannot tell" where the node cannot report its queue). Approval: Solution Designer within the direction; user informed.
- Classification: unchanged, Medium / High (the escalation trigger for a node change fired and is accepted: one field in the snapshot payload, node and page in one change).
- Handoff: `handoff-architecture-design-revised-sr-003.md` → `/architecture_reviewer`.
