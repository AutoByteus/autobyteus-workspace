# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user request plus requirements investigation | N/A | N/A | Approved | BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-010; SCN-001–SCN-005 | Exact Astra and Fable 5.1 pricing/metadata requirements were explicitly approved on 2026-09-22 |
| SR-002 | Design | User approval of SR-001 plus architecture investigation | UNK-001, RISK-002 | Requirements Approved / design not yet created | Architecture Design Complete | BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-010; SCN-001–SCN-004 | Small/Low design reuses the existing exact catalog and pricing pipeline; one production catalog file plus focused tests/docs |

## Revision Entries

### SR-001 — Exact Astra and Fable 5.1 pricing support baseline

- Phase and classification: `Initial Baseline`.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User reported missing Astra price in the Codex App Server runtime, suspected Fable 5.1 was also unsupported, requested correct support, and explicitly waived real paid-model testing because the existing framework is considered robust.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: N/A / design not yet created.
- Current authoritative requirements/design status: Requirements `Approved`; design in progress.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001–BEH-004; REQ-001–REQ-010; AC-001–AC-010; SCN-001–SCN-005; DEC-001–DEC-003.
- Scenario-basis or scenario-validity changes: Established Codex Astra and Claude Fable 5.1 as supported normal target scenarios when the respective runtime exposes the exact ID; classified unrecorded pricing variants as unsupported for this package; established non-live validation as a supported operational scenario.
- Why this baseline or revision was recorded: Investigation confirmed both exact IDs are absent from the shared pricing catalog, verified current first-party price/metadata contracts, traced the existing runtime-to-pricing-to-UI production path, and made the intended Standard-only/prospective/no-paid-test boundaries explicit.
- Canonical requirements, investigation and design sections changed: Created and completed `requirements-doc.md` and `investigation-notes.md`; no design exists yet.
- Supplemental artifacts added, changed or removed: Added this `solution-revision-record.md`.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request or UI redesign.
- Intended behavior changed: `Yes` — additive exact pricing/metadata support for two models was approved.
- Approval impact, exact approved requirements baseline and user-approval reference: SR-001 at commit `4fda6c4377491ab5401c029a6302d9ca78a4f7cc` was explicitly approved by the user's message `approve` on 2026-09-22, in direct response to the SR-001 summary and approval request.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A — first baseline; architecture design has not started.
- Post-design task-size/risk classification and rationale changes: N/A before design completion.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A — routine approval hold stays in the requirements conversation.
- Downstream and architecture-review impact: Architecture design may proceed; no implementation or review route until the design is complete and classified.
- Remaining gaps, assumptions or blocked decisions: None at the requirements boundary. Architecture must resolve the deferred technical decisions without changing approved intent.
- Next action: Complete architecture investigation/design, classify task size and architectural risk, and apply the handoff rules.

### SR-002 — Architecture design for exact catalog and pricing support

- Phase and classification: `Design`; result `Architecture Design Complete`; `task_size=Small`; `architectural_risk=Low`.
- Triggering user feedback, Product package, investigation evidence, or role/report/round: The user explicitly approved SR-001 with `approve` on 2026-09-22. Architecture investigation then resolved the shared-catalog direct-provider side effect, pricing-helper reuse, focused validation surfaces, and persisted-data decision.
- Triggering finding IDs: `UNK-001` resolved; `RISK-002` resolved by existing-adapter evidence and non-live regression design.
- Prior authoritative requirements/design status: Requirements `Approved` at SR-001; design not yet created.
- Current authoritative requirements/design status: Requirements remain `Approved` at SR-001; `design-spec.md` is `Ready` at SR-002.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: All approved BEH-001–BEH-004, REQ-001–REQ-010, AC-001–AC-010, and supported SCN-001–SCN-004. Unsupported SCN-005 remains out of scope.
- Scenario-basis or scenario-validity changes: None. Architecture maps the already approved Codex, Claude, shared-catalog, and non-paid validation scenarios; it does not promote variant pricing into supported scope.
- Why this baseline or revision was recorded: The exact technical owner, production spines, direct-catalog implications, file responsibilities, local refactor, data transition, tests, documentation, and classification are now complete enough for implementation without reconstructing design decisions.
- Canonical requirements, investigation and design sections changed: Updated approval state and current SR references; extended architecture evidence/findings; created `design-spec.md` with mandatory design sections and complete target mapping.
- Supplemental artifacts added, changed or removed: No behavior-defining supplement. Added `design-spec.md`; the handoff summary will carry the result context and route.
- Prototype evidence or product decisions incorporated: N/A — no Product Design request or UI change.
- Intended behavior changed: `No`. SR-002 implements the unchanged SR-001 approved intent.
- Approval impact, exact approved requirements baseline and user-approval reference: No renewed approval required. SR-001 at commit `4fda6c4377491ab5401c029a6302d9ca78a4f7cc` remains authoritative and was explicitly approved by `approve` on 2026-09-22.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: First complete design; no prior design or review basis existed.
- Post-design task-size/risk classification and rationale changes: Classified `Small/Low`. The production delta is two catalog payload rows plus a private file-local helper rename/generalization in one file; remaining changes are focused tests/docs. Existing APIs, runtime owners, persistence, security, concurrency, deployment, and UI contracts remain unchanged.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: Matching rule selects direct implementation at `/software_engineering_team/implementation_engineer`; full context is in `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/handoff-summary.md`.
- Downstream and architecture-review impact: Direct implementation route selected for the completed Small/Low design; independent architecture review is not selected. No paid-model inference is authorized downstream.
- Remaining gaps, assumptions or blocked decisions: No design blocker. Provider price changes after 2026-09-22 and actual account-specific runtime availability remain external operational risks. The Sonnet 5 stale-price concern remains a separate-ticket candidate.
- Next action: Send the persisted result file to the exact configured implementation recipient and stop after confirmed delivery.
