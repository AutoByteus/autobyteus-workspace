# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user request plus requirements investigation | N/A | N/A | Ready for Approval | BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-010; SCN-001–SCN-005 | Exact Astra and Fable 5.1 pricing/metadata requirements are source-backed and ready for explicit user approval |

## Revision Entries

### SR-001 — Exact Astra and Fable 5.1 pricing support baseline

- Phase and classification: `Initial Baseline`.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User reported missing Astra price in the Codex App Server runtime, suspected Fable 5.1 was also unsupported, requested correct support, and explicitly waived real paid-model testing because the existing framework is considered robust.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A / design not yet created.
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design N/A pending approval.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-010; SCN-001–SCN-005; DEC-001–DEC-003.
- Scenario-basis or scenario-validity changes: Established Codex Astra and Claude Fable 5.1 as supported normal target scenarios when the respective runtime exposes the exact ID; classified unrecorded pricing variants as unsupported for this package; established non-live validation as a supported operational scenario.
- Why this baseline or revision was recorded: Investigation confirmed both exact IDs are absent from the shared pricing catalog, verified current first-party price/metadata contracts, traced the existing runtime-to-pricing-to-UI production path, and made the intended Standard-only/prospective/no-paid-test boundaries explicit.
- Canonical requirements, investigation and design sections changed: Created and completed `requirements-doc.md` and `investigation-notes.md`; no design exists yet.
- Supplemental artifacts added, changed or removed: Added this `solution-revision-record.md`.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request or UI redesign.
- Intended behavior changed: `Yes` — additive exact pricing/metadata support for two models is proposed; no behavior is yet approved.
- Approval impact, exact approved requirements baseline and user-approval reference: Full SR-001 requires explicit user approval. Approval reference pending.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A — first baseline; architecture design has not started.
- Post-design task-size/risk classification and rationale changes: N/A before design completion.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A — routine approval hold stays in the requirements conversation.
- Downstream and architecture-review impact: No implementation or review route until approval and architecture design are complete.
- Remaining gaps, assumptions or blocked decisions: User decisions DEC-001–DEC-003 and explicit approval of SR-001.
- Next action: Present the concise intended-behavior baseline to the user and request explicit approval. After approval, record the reference and begin architecture investigation/design.
