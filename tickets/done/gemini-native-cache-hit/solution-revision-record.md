# Solution Revision Record — gemini-native-cache-hit

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline after live investigation | F1–F6 | N/A | Ready for Approval | BEH-001..004, REQ-001..005, AC-001..007, DEC-001..004 | Superseded by SR-002 |
| SR-002 | Mixed | User approval 2026-10-09 ("just fix them in this ticket") + architecture design | F1, F5 | Ready for Approval | Requirements Approved; Design Ready | REQ-003/AC-004 removed; DEC-001..004 resolved; REQ-002, REQ-004, REQ-005 designed | Architecture Design Complete (Small / Low) |

## Revision Entries

### SR-001 — Evidence-backed baseline: AGY measurement artifact, native prefix stable, 3.1 Pro mispriced

- Phase and classification: Requirements, `Initial Baseline`
- Triggering input: Project Task from `/project_task_manager` (2026-10-09); user direction to run live experiments through an isolated lab vault
- Triggering finding IDs: F1–F6 (`investigation-notes.md`)
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design N/A
- IDs affected: BEH-001..004, UC-001..003, REQ-001..005, AC-001..007, SCN-001..003, DEC-001..004
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline presented for approval
- Canonical sections changed: all (new)
- Supplemental artifacts added: `probes/gemini-cache-lab.mjs`, `probes/e1…e6 *.jsonl`
- Product design evidence: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: pending explicit user approval
- Behavior-defining supplement versions: none
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold in conversation)
- Downstream impact: none yet
- Remaining gaps: DEC-001..004; UNK-001 (Vertex Project not testable without ADC)
- Next action: obtain user approval and decisions, then architecture design

### SR-002 — Approval with narrowed scope; design for the two fixes

- Phase and classification: Mixed (`Refinement` of requirements by user scope narrowing, then design)
- Triggering user feedback: user clarification exchange on 2026-10-09 confirming that the native runtime is correct and only AGY counting and 3.1 Pro pricing are wrong, then "Since you'll notice these two places that have problems, then just fix them in this ticket."
- Triggering finding IDs: F1 (AGY semantic), F5 (3.1 Pro prices)
- Prior status: requirements Ready for Approval; design N/A
- Current status: requirements Approved (SR-002); `design-spec.md` Ready
- IDs affected: REQ-003 and AC-004 removed; DEC-001/002 resolved fix-forward; DEC-003 resolved no explicit caching; DEC-004 resolved (corrected comparison accepted)
- Scenario-basis changes: SCN-001 is now preserved-only (no change)
- Why recorded: explicit user approval and completed design
- Canonical sections changed: requirements Document Status, Requirements, Acceptance Criteria, Open Decisions, Traceability, Readiness; new `design-spec.md`; investigation-notes Architecture Investigation Findings
- Supplemental artifacts: unchanged
- Intended behavior changed: `Yes` (scope narrowed by the user; approved in the same message)
- Approval impact: approved baseline is SR-002; approval reference is the user message of 2026-10-09
- Affected design/review basis: new design
- Post-design classification: `task_size = Small`, `architectural_risk = Low`. Two value-level corrections in existing owners using existing contracts; no migration
- Applied handoff-rule outcome: recorded in `handoff-architecture-design-complete.md`
- Downstream impact: implementation of two fixes plus focused tests
- Remaining gaps: UNK-001/002 out of scope; AGY series spanning the upgrade keep the pre-upgrade gross gap (accepted)
- Next action: route per handoff rules
