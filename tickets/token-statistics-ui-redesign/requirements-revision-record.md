# Token Statistics UI Redesign — Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial request, current-state/code investigation, and `origin/personal` bootstrap clarification | N/A | Draft — Requirements Visualization Needed | BEH-001–BEH-006; REQ-001–REQ-014; AC-001–AC-014; DEC-001–DEC-004 | Coherent requirements baseline and focused visualization decision set |

## Revision Entries

### RER-001 — Initial professional Token Statistics UI baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user rejected the current Token Statistics UI as ugly and unprofessional, supplied two populated Analytics captures, and explicitly required bootstrap from `origin/personal`.
- Prior authoritative status: `N/A`
- Current authoritative status: `Draft — Requirements Visualization Needed`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-014`; `AC-001`–`AC-014`; `SCN-001`–`SCN-006`; `DEC-001`–`DEC-004`.
- Why this baseline or revision was recorded: Code, tests, docs, prior approved artifacts, and supplied runtime captures provide a coherent current/preserved behavior basis. Material future-state hierarchy and interaction decisions remain visual and require an interactive exploration before approval.
- Canonical artifact sections changed: Initial full requirements document; investigation evidence; prototype decision; scope guardrail; readiness and deferred routing assessment.
- Supplemental artifacts added, changed, or removed: Linked both user-supplied current-state captures and the prior analytics UI/UX/data-contract artifacts. No Product-owned future-state artifacts exist yet.
- Prototype evidence or product decisions incorporated: Prior visual treatment is identified as superseded by the new user request; prior analytics semantics, no-content-header decision, and manual Settings navigation remain preservation constraints. Requirements Visualization is selected as the least-expensive next evidence.
- User approval impact: No future-state behavior approval yet. The `origin/personal` bootstrap source is explicitly confirmed.
- Downstream architecture or direct-implementation route impact: No engineering route is allowed before the visual decisions, requirements approval, readiness gate, and routing assessment.
- Remaining gaps, assumptions, or blocked decisions: `DEC-001` hierarchy, `DEC-002` control density, `DEC-003` exact-evidence presentation, `DEC-004` Run-details extent; `ASM-001`–`ASM-003` require confirmation.
- Next action or recipient: Apply dynamic handoff rules for outcome `Requirements Visualization Needed`; Product Design & Prototyping should bootstrap the selected frontend from pinned `origin/personal`, produce a review-ready interactive visualizer, and return its review URL/artifacts to Requirements Engineering for user clarification.
