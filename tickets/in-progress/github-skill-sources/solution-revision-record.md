# Solution Revision Record

## Revision Index
| Revision | Phase | Trigger | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user GitHub skill import request + screenshot | N/A | Ready for Approval | BEH-001–004, UC-001–004, REQ-001–008, AC-001–008, SCN-001–005 | Await explicit approval |
| SR-002 | Requirements/Evidence | Abort-on-conflict clarification | Ready for Approval | Ready for Approval | REQ-004/007 | Preserve local sources and whole-operation rejection |
| SR-003 | Evidence | Runtime-default explanation | Ready for Approval | Ready for Approval | BEH-004 | No behavior change |
| SR-004 | Evidence | User confirms rule | Ready for Approval | Ready for Approval | REQ-004/007 | Preservation confirmed |
| SR-005 | Evidence | User explains rationale | Ready for Approval | Ready for Approval | BEH-004 | Explicit choices override forgotten platform defaults |
| SR-006 | Requirements | USER-APPROVAL-006 | Ready for Approval | Approved | All baseline IDs | Design authorized |
| SR-007 | Design | Approved baseline + A-001–011 | Design N/A | Design Ready | All baseline IDs | Architecture Design Complete; Large/High |

## SR-001 — Public GitHub skill sources baseline
- Classification: Initial Baseline; triggering finding IDs: N/A.
- Evidence: investigation-notes.md E-001–010. New target scenario basis comes from user's explicit feature request and existing package/source workflows.
- Prior requirements/design: N/A / N/A. Current requirements: Ready for Approval. Design: N/A, not started.
- Canonical artifacts created: requirements-doc.md, investigation-notes.md, this record. Screenshot linked as supporting user evidence; no behavior-defining supplements or Product package.
- Intended behavior: newly proposed, not approved. Root/collection layouts, default branch, check-on-open cadence, conflict continuity, explicit overwrite/remove consequences and public-only bounded scope require user approval.
- Exact approved baseline and approval reference: none. Proposed basis: requirements-doc.md SR-001, all sections.
- Design/review/routing impact: no architecture/implementation handoff until approval. Task size/risk and independent review artifacts: N/A — not applicable before completed design.
- Remaining decision: DEC-001 explicit approval or changes to this baseline.
- Next action: present concise scope and ask for approval. Routine approval hold stays with user; no specialist handoff.

## SR-002 — Preserve abort-on-conflict and local sources
- Phase: Requirements/Evidence; classification: Refinement. Trigger: user's follow-up confirming local-folder preservation and asking whether duplicate names abort with an error.
- Prior/current status: Ready for Approval / Ready for Approval; design N/A.
- Affected: BEH-004, REQ-004/007, AC-004/007, SCN-001/003/005. No scenario validity changes.
- Changes: REQ-004 makes whole-operation abort, no partial installation/overwrite, and error details explicit; investigation records rechecked validator/store evidence.
- Intended-behavior change: No; clarification of proposed existing contract. Existing runtime-default shadow exception retained and explained to user.
- Approval impact: preservation confirmed by quoted follow-up; no full-baseline approval inferred from a targeted confirmation/question. Exact approved full requirements baseline: none. Supplements: none.
- Design/review/classification: N/A — not started. No downstream forwarding.
- Next action: answer factual question, clarify runtime-default exception, obtain approval of remaining proposed scope.

## SR-003 — Existing runtime-default policy explained
- Phase/classification: Evidence / Refinement. User requests explanation and reiterates preservation.
- Prior/current requirements status: Ready for Approval / Ready for Approval; design N/A.
- Affected references: BEH-004, REQ-004/007, AC-004/007, SCN-001/003/005. No normative requirements or scenario changes.
- Investigation extended with default-folder registration, canonical path identity, fallback precedence and Codex bootstrap preflight evidence.
- Intended behavior changed: No. Preservation confirmed; no full-baseline approval inferred. Existing proposed requirements baseline remains SR-002; cumulative solution round SR-003.
- Supplements, technical design/review/classification: N/A. Next action: answer current-behavior question; no implementation handoff.

## SR-004 — User confirms unchanged duplicate policy
- Phase: Evidence; classification: Refinement. User agrees the current rule should stay and asks whether it is reasonable.
- BEH-004 / REQ-004/007 / AC-004/007 preservation confirmed, including runtime-default exception explained in SR-003. Requirements unchanged from SR-002; no supplements.
- Prior/current overall status: Ready for Approval / Ready for Approval. This policy confirmation does not assert approval of all unrelated requirements. Design, review, task-size/risk: N/A.
- Next action: provide concise assessment and retain this rule for proposed GitHub imports/updates. No downstream-ready package.

## SR-005 — Original precedence rationale captured
- Phase/classification: Evidence / Refinement. Trigger: user explains original purpose of precedence over forgotten Codex/Claude skill installations.
- Affected: BEH-004, REQ-004/007, AC-004/007; requirements rationale and investigation notes updated. No scenario, acceptance-criteria or behavior changes.
- Exact preserved-policy confirmation: current user message beginning “Exactly. What we want to achieve...” and preceding SR-004 agreement. Entire requirements baseline remains pending approval; normative behavior unchanged from SR-002.
- Prior/current status: Ready for Approval / Ready for Approval. Design/reviews/classification/supplements: N/A.
- Next action: acknowledge rationale and the English expression “take precedence”; preserve this policy in GitHub skill-source work.

## SR-006 — Explicit requirements approval
- Phase: Requirements; classification: approval capture, no intended-behavior change.
- Trigger and approval reference USER-APPROVAL-006: user says “Yes, let's go.” after scope presentation and preserved precedence rationale.
- Prior/current status: Ready for Approval / Approved. Exact pre-status-update content preserved in approved-requirements-sr006.md; current canonical requirements-doc.md records approval. All BEH/UC/REQ/AC/SCN IDs in package approved. No normative supplements; screenshot is current-state evidence only.
- Design basis authorized; technical design not complete yet, size/risk N/A. Next action: additional architecture investigation and complete design before applicable independent routing.

## SR-007 — Architecture design complete
- Phase: Design; classification: Initial architecture baseline. Trigger USER-APPROVAL-006; evidence A-001–011 and external primary documentation in investigation.
- Prior/current requirements: Approved / Approved (SR-006); design: N/A / Ready. Intended behavior unchanged; all BEH-001–004, SCN-001–005, REQ-001–008 and AC-001–008 traced.
- Design: managed source lifecycle, generation-pointer publication, unchanged local settings/catalog policy, shared GitHub metadata transport, archive safety, source GraphQL/UI and transient workspace freshness. No persisted-data migration.
- Canonical changes: investigation architecture section, new design-spec.md and architecture-handoff.md. Requirement readiness references updated without changing intent. Approved snapshot remains immutable; Product artifacts N/A.
- task_size=Large, architectural_risk=High: new source persistence/API/untrusted archive/serialization plus multiple subsystem consumers, not content volume.
- Independent architecture/code review and downstream artifacts: N/A — not applicable yet; no tests or implementation claimed.
- Approval basis: USER-APPROVAL-006, approved-requirements-sr006.md hash in design. No renewed approval required for technical design.
- Routing: apply get_handoff_rules after persisting full handoff; result recorded in architecture-handoff.md. Next expected action: independent architecture review, not direct implementation.
