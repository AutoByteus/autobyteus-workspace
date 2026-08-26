# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial user request plus current backend/task-message contract investigation | N/A | Ready for Approval | BEH-001–BEH-007; REQ-001–REQ-011; AC-001–AC-011; DEC-001 | Coherent requirements baseline and orchestration decision table created; user decision/approval pending |

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
