# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and requirements baseline from user request and three screenshots | N/A | Ready for Approval | BEH-001–BEH-004; REQ-001–REQ-007; AC-001–AC-011 | Defined a presentation-only recursive nested-Team status aggregate, full precedence, collapsed live behavior, contract guardrails, and approval question. |

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
