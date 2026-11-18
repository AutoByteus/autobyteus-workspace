# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-540 (533 FU-006); investigation and measurement | N/A | N/A | Approved (Solution Designer within the direction; user informed) | BEH-001…007; REQ-001…006; AC-001…007 | Baseline with reproduced root cause |
| SR-002 | Mixed | Design: the Team/Org in-flight case cannot be decided after a rebind; clear-on-edit would need draft watching | N/A | Approved (SR-001) | Requirements Approved (refined); design Ready | REQ-004, AC-004, DEC-005 | Two notice texts, dismiss instead of clear-on-edit; design spec written; Medium / High |

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
