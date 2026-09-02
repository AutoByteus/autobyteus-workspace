# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and coherent clarification baseline | N/A | Draft | BEH-001, BEH-002; REQ-001–REQ-005; DEC-001 | Fixed prompt source and construction path confirmed; overlap policy remains open. |
| RER-002 | User clarification and final wording approval | Draft | Approved | BEH-001, BEH-002; REQ-001–REQ-005; AC-001–AC-004; SCN-001; DEC-001 | Single-most-specific-rule, single-recipient behavior approved; direct implementation route selected. |

## Revision Entries

### RER-001 — Fixed handoff-prompt source and ambiguity baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that wording requiring every matching owner to be notified is causing confusion and asked to locate the fixed Team communication text.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Draft
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001, BEH-002; REQ-001–REQ-005; AC-001–AC-004; SCN-001; DEC-001.
- Scenario-basis or scenario-validity changes: Established SCN-001 as the supported Team-member completion/blocker handoff scenario.
- Why this baseline or revision was recorded: Code, docs, tests, and history confirm the disputed text is in the shared backend prompt and reveal a material open decision about overlapping conditions.
- Canonical artifact sections changed: Initial creation of all requirements and investigation sections.
- Supplemental artifacts added, changed, or removed: None beyond canonical revision record.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request.
- User approval impact: Approval not yet requested; DEC-001 must be resolved first.
- Downstream architecture or direct-implementation route impact: No route selected until clarification and approval.
- Remaining gaps, assumptions, or blocked decisions: DEC-001 — first/best-match-only versus multiple independently applicable recipients.
- Next action or recipient: Ask the user to choose DEC-001, then revise and present the approval-ready requirements package.

### RER-002 — Single-recipient final wording approval

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User clarified that a completion/blocker handoff is for one recipient, accepted the sentence selecting the single rule whose `when` condition most specifically applies, and instructed the department to record it as final and start work.
- Prior authoritative status (`N/A` for `RER-001`): Draft
- Current authoritative status: Approved
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001, BEH-002; REQ-001–REQ-005; AC-001–AC-004; SCN-001; DEC-001.
- Scenario-basis or scenario-validity changes: SCN-001 now explicitly produces at most one recipient notification for each completed or blocked outcome.
- Why this baseline or revision was recorded: Resolves the material routing-semantics decision and establishes the exact normative replacement paragraph.
- Canonical artifact sections changed: Status/approval, problem/outcome, current-versus-desired behavior, scope guardrail, requirements, acceptance criteria, scenario, quality constraints, decision log, readiness gate, and routing assessment; investigation evidence and downstream notes updated consistently.
- Supplemental artifacts added, changed, or removed: No new supplement.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request.
- User approval impact: Explicit approval recorded from the user's 2026-09-02 message.
- Downstream architecture or direct-implementation route impact: Readiness gate passes; assessment selects `Approved Direct-Implementation` with preliminary Small/Low classification and no structural-impact trigger.
- Remaining gaps, assumptions, or blocked decisions: None.
- Next action or recipient: Apply dynamic handoff rules for direct implementation using package `HRPC-2026-09-01` and the canonical absolute artifact paths.
