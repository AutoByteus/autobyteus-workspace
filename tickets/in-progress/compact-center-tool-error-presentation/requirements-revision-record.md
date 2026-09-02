# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `RER-001` | User reported center event-monitor flooding, supplied center/Activity screenshots, specified that detail belongs only in Activity, and requested a new ticket bootstrap | `N/A` | `Ready for Approval` | `BEH-001`–`BEH-004`; `REQ-001`–`REQ-007`; `AC-001`–`AC-009`; `SCN-001`–`SCN-004`; `DEC-001` | Initial evidence-backed compact-center requirements baseline created; prior duplicate-detail UI obligations identified for precise supersession |

## Revision Entries

### RER-001 — Compact center failure card and Activity-owned details baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User screenshots showed a failed command's complete diagnostic flooding the center stream while the right Activity panel already contained expandable Arguments and Error details. The user stated the center does not need detailed error content and existing red failure treatment is sufficient, then requested a new ticket bootstrap.
- Prior authoritative status (`N/A` for `RER-001`): `N/A`
- Current authoritative status: `Ready for Approval`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: Initial creation of `BEH-001`–`BEH-004`, `REQ-001`–`REQ-007`, `AC-001`–`AC-009`, `SCN-001`–`SCN-004`, `QR-001`–`QR-004`, `ASM-001`–`ASM-002`, and `DEC-001`.
- Scenario-basis or scenario-validity changes: Established normal active-run, diagnostic-navigation, replay, and failed-tool-contract scenarios. Confirmed the reported long output belongs to a genuine failed compound command rather than a false frontend failure classification.
- Why this baseline or revision was recorded: Create a durable urgent UI ticket with an exact information-hierarchy boundary, raw-trace root-cause evidence, and protection against losing the detailed diagnostic.
- Canonical artifact sections changed: Initial full `requirements-doc.md` and `investigation-notes.md` baseline.
- Supplemental artifacts added, changed, or removed: Added `observed-long-failure-analysis.md` and copied the two user-supplied screenshots into `evidence/`.
- Prototype evidence or product decisions incorporated: No Product Design work was requested. User's explicit target—compact red center status and detailed Activity—was recorded directly.
- User approval impact: The request supplies strong intended-behavior evidence, but the complete requirements package and its shared-card/no-excerpt interpretation have not yet received explicit approval.
- Downstream architecture or direct-implementation route impact: No route selected before approval. Current evidence suggests a bounded frontend presentation correction, but formal size/risk/routing assessment is deferred.
- Remaining gaps, assumptions, or blocked decisions: Explicit approval of `DEC-001` (no excerpt or alternate center detail) and `ASM-002` (shared failed-tool-card scope); prepared-environment executable validation.
- Next action or recipient: User reviews and explicitly approves/revises this baseline. Requirements Engineer then records approval, completes routing assessment, and applies dynamic handoff rules.
