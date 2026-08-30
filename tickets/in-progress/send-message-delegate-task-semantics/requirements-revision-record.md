# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial user request plus current backend/task-message contract investigation | N/A | Ready for Approval | BEH-001–BEH-007; REQ-001–REQ-011; AC-001–AC-011; DEC-001 | Coherent requirements baseline and orchestration decision table created; user decision/approval pending |
| RER-002 | User explicitly requested a visualized requirement | Ready for Approval | Draft — Requirements Visualization Needed | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Focused exploratory visualizer brief added; cross-team Product Prototyper handoff required before user decision/approval |
| RER-003 | Product Design & Prototyping returned review-ready `SMDS-RV-001` / `VIS-R04` | Draft — Requirements Visualization Needed | Ready for Approval | REQ-001–REQ-007, REQ-010; AC-001–AC-008; DEC-001 | Exploratory visualizer evidence reconciled and review URL presented; DEC-001 and explicit approval remain pending |

## Revision Entries

### RER-001 — Initial Message-vs-Delegation Semantic Baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that planners exposed to both tools treat `delegate_task` and `send_message_to` as interchangeable and may call both for one assignment. Static source and approved-contract investigation confirmed distinct configured-ingress versus fresh-task-execution semantics and an under-specified decision boundary in current Agent-facing copy.
- Prior authoritative status (`N/A` for `RER-001`): N/A
- Current authoritative status: Ready for Approval
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: BEH-001–BEH-007; REQ-001–REQ-011; AC-001–AC-011; SCN-001–SCN-007; DEC-001
- Why this baseline or revision was recorded: Establish a precise non-interchangeability rule without accidentally removing the currently approved exact-run clarification capability.
- Canonical artifact sections changed: All initial sections of `requirements-doc.md`; complete evidence baseline in `investigation-notes.md`.
- Supplemental artifacts added, changed, or removed: Added `orchestration-decision-table.md` as a proposed behavior-defining supplement.
- Prototype evidence or product decisions incorporated: Prototype not applicable. Incorporated current shared prompt/tool descriptions, backend routing/activation behavior, and the prior user-approved universal task-delegation interaction contract.
- User approval impact: Explicit approval is required. DEC-001 asks whether genuine post-delegation exact-run clarification remains allowed (recommended) or all delegator-to-assignee ordinary follow-up is prohibited (broader change).
- Downstream architecture impact: No architecture handoff until DEC-001 is resolved and intended behavior is approved. The approved package will constrain architecture to prompt/tool/docs/verification semantics while preserving runtime APIs and lifecycle unless Option B is chosen and requirements are revised.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; confirmation that “synchronous” is organizational shorthand rather than a transport timing requirement.
- Next action or recipient: User review and explicit decision/approval.

### RER-002 — Requirements Visualization Request

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user explicitly asked Requirements Engineering to send the requirement to Product Prototyper because they want to see the visualized requirement.
- Prior authoritative status (`N/A` for `RER-001`): Ready for Approval under RER-001; DEC-001 open.
- Current authoritative status: Draft — Requirements Visualization Needed.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-001–REQ-007, REQ-010; AC-001–AC-008; SCN-001–SCN-006; DEC-001.
- Why this baseline or revision was recorded: The user's chosen evidence path changed from direct prose review to an interactive exploratory visualization intended to clarify execution identity and the allowed relationship between messaging and delegation.
- Canonical artifact sections changed: Requirements document status, visualization fields, supplements, readiness; investigation prototype decision/source log/inventory.
- Supplemental artifacts added, changed, or removed: Added `requirements-visualization-brief.md`.
- Prototype evidence or product decisions incorporated: No returned prototype evidence yet. The brief requests a requirements visualizer, not a final product prototype or final UI/UX specification.
- User approval impact: No approval inferred. Requirements Engineering must present the returned review URL, record the user's DEC-001 choice and any refinements, then seek explicit requirements approval.
- Downstream architecture impact: Architecture handoff remains blocked until visualization review and explicit approval are complete.
- Remaining gaps, assumptions, or blocked decisions: Product Prototyper visualizer return; DEC-001; user approval.
- Next action or recipient: Dynamic handoff to Product Design & Prototyping using the returned `Requirements Visualization Needed` rule.

### RER-003 — Requirements Visualization Return

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Design & Prototyping returned `SMDS-RV-001` / `VIS-R04` in its separate repository with a runnable review URL, scenario coverage, visual references, and validation evidence.
- Prior authoritative status (`N/A` for `RER-001`): Draft — Requirements Visualization Needed under RER-002.
- Current authoritative status: Ready for Approval.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: REQ-001–REQ-007, REQ-010; BEH-001–BEH-005; AC-001–AC-008; SCN-001–SCN-006; DEC-001.
- Why this baseline or revision was recorded: Reconcile the externally owned exploratory evidence into the canonical package before user review while preserving the boundary between requirements clarification and final UI/UX specification.
- Canonical artifact sections changed: Requirements document status, interaction evidence, supplemental artifacts, traceability, and readiness; investigation status, source log, prototype findings, and supplement inventory.
- Supplemental artifacts added, changed, or removed: Linked the Product-owned `requirements-visualization-review.md`, prototype ticket, validation evidence, and non-normative visual-reference directory; no Product artifact was copied into the requirements workspace.
- Prototype evidence or product decisions incorporated: VIS-R04 visually distinguishes mounted/configured execution messaging, fresh task execution creation, incorrect duplicate logical-address resend, exact-run clarification, formal lifecycle, and delegation failure. It compares DEC-001 Option A and Option B but does not choose between them.
- User approval impact: No approval inferred. The user must choose DEC-001 and explicitly approve the intended behavior and behavior-defining decision table.
- Downstream architecture impact: No architecture handoff until user decision and approval. The visualizer adds explanatory evidence only and does not change architecture scope.
- Remaining gaps, assumptions, or blocked decisions: DEC-001; explicit requirements approval.
- Next action or recipient: User review at `http://127.0.0.1:4179`, followed by Requirements Engineering integration of the decision and approval status.
