# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| `RER-001` | User reported center event-monitor flooding, supplied center/Activity screenshots, specified that detail belongs only in Activity, and requested a new ticket bootstrap | `N/A` | `Ready for Approval` | `BEH-001`–`BEH-004`; `REQ-001`–`REQ-007`; `AC-001`–`AC-009`; `SCN-001`–`SCN-004`; `DEC-001` | Initial evidence-backed compact-center requirements baseline created; prior duplicate-detail UI obligations identified for precise supersession |
| `RER-002` | User clarified that failed center presentation must match the simple successful row pattern except for red state, and that right-side Activity Error must start collapsed like Result and open only by user choice | `Ready for Approval` | `Ready for Approval` | `BEH-001`, `BEH-002`; `REQ-004`, `REQ-007`, `REQ-008`; `AC-002`–`AC-005`, `AC-007`, `AC-008`, `AC-010`; `SCN-002`–`SCN-004`; `QR-004`, `QR-005`; `DEC-002` | Revised the same ticket to require progressive disclosure on both surfaces while preserving complete Activity diagnostics and the outer Activity-card default |

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


### RER-002 — Default-collapsed Activity Error and normal-row parity

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user clarified that normal/successful center tool rows do not show Result content, so a failed center row likewise should not show Error content and should differ chiefly through its red failed state. The user also supplied a close-up showing right-side Activity Error expanded by default and explicitly required Error to start closed like Result so inspection is a user choice.
- Prior authoritative status: `Ready for Approval` (`RER-001`)
- Current authoritative status: `Ready for Approval` (`RER-002`); not approved or routed
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: Refined `BEH-001` and `BEH-002`; refined `REQ-004` and `REQ-007`; added `REQ-008`; refined `AC-002`–`AC-005`, `AC-007`, and `AC-008`; added `AC-010`; refined `SCN-002`–`SCN-004` and `QR-004`; added `QR-005` and `DEC-002`.
- Scenario-basis or scenario-validity changes: `SCN-002` and `SCN-003` now distinguish navigation/highlighting from disclosure: Activity Error remains closed through direct render, live failure, replay, selection, and center-row navigation until the user explicitly activates Error. Scenario validity remains `Supported Normal Scenario` based on the existing surface and direct user decision.
- Why this revision was recorded: The initial baseline incorrectly preserved the current default-open Error behavior. The new clarification makes default-collapsed Activity detail part of the intended product outcome and prevents the same large-payload flooding problem on the right.
- Canonical artifact sections changed: Problem/desired outcome, behavior table, scope guardrail, prior-requirement interpretation, requirements, acceptance criteria, scenarios, UI/interaction, quality, dependencies, supplemental inventory, decisions, traceability, downstream inputs, readiness, and investigation evidence.
- Supplemental artifacts added, changed, or removed: Added `evidence/user-activity-error-expanded-default.png` with SHA-256 `ca408a56ceadaa3520259c2c83c5aa92cc3bbfa0278966901a8f645a2121edc6`; updated `observed-long-failure-analysis.md` verification implications.
- Prototype evidence or product decisions incorporated: No Product Design work was requested. The user's explicit decision is recorded as proposed `DEC-002`: Activity Error never auto-opens on render, replay, selection, highlight, or center-row navigation; its body appears only after explicit Error activation.
- User approval impact: This materially changes intended right-side behavior from `RER-001`, so explicit approval must cover the complete `RER-002` package before routing.
- Downstream architecture or direct-implementation route impact: No route selected before approval. Investigation identifies the current independent outer-card and per-section defaults so downstream does not mistakenly collapse the whole Activity item or alter Result.
- Remaining gaps, assumptions, or blocked decisions: Explicit approval of `DEC-001`, `DEC-002`, and `ASM-002`; prepared-environment executable validation across live, replay, direct-view, selection/highlight, desktop, and narrow states.
- Next action or recipient: User reviews and explicitly approves or revises `RER-002`. Requirements Engineer then records approval, performs the routing assessment, and applies the dynamic handoff rule.
