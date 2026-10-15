# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task ee74d72b (revised) handed over 2026-10-15 | N/A | N/A | Approved | BEH-001..005; REQ-001..006; AC-001..007; DEC-001..004 | Approved (Solution Designer within the direction; DEC-004 by the user) |
| SR-002 | Design | Architecture design | N/A | Requirements Approved; design N/A | Design Ready; Medium / High | all | Architecture Design Complete |
| SR-003 | Mixed | Architecture review ARCH-REV-001 (Fail) | ARCH-F-001..004 | Design Ready (SR-002) | Requirements Approved (SR-003, Solution Designer within the direction, user informed); Design Ready | BEH-004, BEH-005, AC-004, AC-005, AC-008 (new), DEC-005 (new); design scope + removal plan | Revised; back to review |

## Revision Entries

### SR-001 — Requirements baseline: two task tools, no automatic exposure

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Project Task `project_task_ee74d72b-3733-4383-9e5d-20372867e06a` (revised direction agreed with the user on 2026-10-15; handed over by the PM the same day; formal assignment after 259ddae7 is DONE).
- Current status: `Approved`. DEC-004: the user ruled agent configurations out of scope (2026-10-15); the PTM package update is follow-up FU-1 for another agent. REQ-006/AC-007 rewritten accordingly.
- Supplements: `temp-task-tool-split-proposal.md`.
- Coordination: Task 259ddae7 (`collaboration-model-contract`) changes the same agent texts; whichever is implemented second rebases.
- Next action: architecture design.

### SR-002 — Architecture design: two tools, tool-neutral texts

- Phase and classification: Design (`Initial Baseline` of the design).
- Requirements unchanged (SR-001 approval applies).
- Design: `create_task` / `update_task` from one contract module; no automatic task tool; collaboration texts, `@` note and reactivation errors become tool-neutral; closing/reopening guidance lives in `update_task`'s description. No data migration (`Not Affected`).
- Classification: `task_size=Medium`, `architectural_risk=High` (public agent tool contract and default exposure change; configurations naming the old tool lose it until FU-1).
- Follow-ups: FU-1 (Project Task Manager package, another agent, must ship with this release), FU-2 (optional project tool split).
- Handoff: `handoff-architecture-review.md`.

### SR-003 — Review fixes: AutoByteus filter removed, tool-neutral shared texts reconciled, saved notes parse

- Phase and classification: Mixed (`Design Impact` ARCH-F-001, -003, -004; `Requirement Gap` ARCH-F-002).
- Trigger: `design-review-report.md` (ARCH-REV-001, Fail).
- ARCH-F-001: the AutoByteus-only filter `autobyteus-collaboration-tool-exposure.ts` drops `create_task`; it is otherwise dead (no listed legacy or removed tool is registered; the category check matches nothing it would drop). Design removes the file and its call; adds an AutoByteus resolver test. Spine DS-001 extended through the per-runtime step.
- ARCH-F-002: BEH-004/AC-004 rewritten to tool-neutral reactivation guidance (consistent with REQ-005; the error reaches any sender).
- ARCH-F-003: DEC-005: the `@` note drops the closing sentence for every agent; AC-005/BEH-005 rewritten; proposal clarified (item 4 is a restriction met by never mentioning closing in shared texts).
- ARCH-F-004: parser accepts the previous release's delegate sentence in every combination; new AC-008 with parse tests.
- Intended behavior changed: `Yes` (narrowing/clarification within the direction). Approval: Solution Designer within the direction; the user is informed in the Solution Designer's conversation.
- Classification: unchanged (`Medium`, `High`).
- Also fixed: investigation notes meta SR; release-notes line about MCP name collisions.
- Next action: re-review.

- Review outcome (informational): ARCH-REV-002 **Pass** on SR-003 (2026-10-15); the reviewer handed the package to `/software_engineering_team/implementation_engineer`. Editorial corrections after the pass: SCN-004 expected outcome made tool-neutral (matching AC-004), investigation notes status line. No re-review needed.
