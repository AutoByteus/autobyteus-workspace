# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and requirements baseline from user request and three screenshots | N/A | Ready for Approval | BEH-001–BEH-004; REQ-001–REQ-007; AC-001–AC-011 | Defined a presentation-only recursive nested-Team status aggregate, full precedence, collapsed live behavior, contract guardrails, and approval question. |
| RER-002 | User clarification and approval of nested-Team-only aggregate behavior | Ready for Approval | Approved | BEH-001–BEH-004; REQ-001–REQ-007; DEC-001; ASM-001–ASM-003 | Preserved binary root TeamRun activity, approved recursive nested-Team aggregation and precedence, passed readiness, and selected direct implementation. |

## Revision Entries

### RER-001 — Nested Team aggregate status baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that nested Team execution works but its Team row has no status; supplied expanded, running+idle, and collapsed screenshots and requested a blue busy indicator before the Team avatar.
- Prior authoritative status (`N/A` for `RER-001`): `N/A`
- Current authoritative status: `Ready for Approval`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-004`; `REQ-001`–`REQ-007`; `AC-001`–`AC-011`; `SCN-001`–`SCN-004`; `DEC-001`; `ASM-001`–`ASM-003`.
- Why this baseline or revision was recorded: The request is coherent and current behavior is verified in code, docs, tests, and screenshots. The baseline completes unspecified mixed/recursive states so the feature can be approved and tested without creating an authoritative Team lifecycle.
- Canonical artifact sections changed: Initial creation of all requirements and investigation sections, including the aggregate status decision table, prototype decision, readiness check, and preliminary structural-surface evidence.
- Supplemental artifacts added, changed, or removed: Linked the three user-owned current-state PNGs with absolute paths and SHA-256 identities.
- Prototype evidence or product decisions incorporated: No prototype requested; current visual language and exact placement are sufficiently clear. Proposed decision: recursively aggregate current descendant Agent executions, including task-scoped descendants, with precedence `running > initializing > error > idle > offline`.
- User approval impact: Explicit approval is required. Running+idle blue is directly requested; the full precedence and descendant scope remain proposed until the user approves `DEC-001`.
- Downstream architecture or direct-implementation route impact: No route assessment performed before approval. Preliminary evidence shows no required contract, persistence, lifecycle, deployment, or ownership change, but formal classification is deferred.
- Remaining gaps, assumptions, or blocked decisions: `DEC-001`; baseline runtime tests not executed because worktree dependencies are absent.
- Next action or recipient: Present the proposed intended behavior and `DEC-001` to the user for explicit approval or revision.

### RER-002 — Nested-Team-only approval and routing completion

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user asked whether the proposed behavior matched the root Team and how the root Agent contributed. Requirements Engineering clarified that the root TeamRun dot is binary activity, the root/coordinator Agent has its own exact status, and the proposed recursive aggregate applies only to stable nested Team rows. The user then stated: “I agree with your suggestion. Add aggregates to status only to the nested team rows.”
- Prior authoritative status (`N/A` for `RER-001`): `Ready for Approval`
- Current authoritative status: `Approved`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-004`; `REQ-001`–`REQ-007`; `AC-001`–`AC-011`; `SCN-001`–`SCN-004`; `DEC-001`; `ASM-001`–`ASM-003`.
- Why this baseline or revision was recorded: The clarification made the root-versus-nested status boundary explicit and the user approved the recommended bounded behavior, resolving the only material decision.
- Canonical artifact sections changed: Document status and approval reference; requirement decision references; UI confirmation and unresolved decisions; assumptions and decision status; readiness check; Architecture Design Routing Assessment; investigation clarification, evidence, and downstream notes.
- Supplemental artifacts added, changed, or removed: None; all three current-state screenshots remain relevant.
- Prototype evidence or product decisions incorporated: No prototype. Approved presentation-only recursive/task-scoped Agent aggregation for stable nested Team rows with precedence `running > initializing > error > idle > offline`; preserved the binary root TeamRun dot and root/coordinator Agent's independent exact status.
- User approval impact: Explicit approval received; no unresolved product decision remains.
- Downstream architecture or direct-implementation route impact: Readiness passed. Requirements Engineering assessed preliminary size `Small`, preliminary risk `Low`, found no structural-impact trigger, and classified the package `Approved Direct-Implementation` for the Implementation Engineer route.
- Remaining gaps, assumptions, or blocked decisions: No requirements blocker. Focused runtime/component tests remain downstream verification because dependencies were unavailable in the requirements worktree.
- Next action or recipient: Implementation Engineer rechecks the direct route, implements the bounded frontend behavior, and returns `Design Impact` or `Requirement Gap` if contrary evidence appears.
