# Solution Revision Record — Project Task Manager Foundations

## Revision Index
| ID | Phase | Trigger | Finding IDs | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request 2026-10-02 and source investigation | N/A — initial baseline | N/A | Draft | BEH-001–006, SCN-001–007, REQ-001–010, AC-001–012, DEC-001–010 | Product Design Requested |
| SR-002 | Requirements | Product UF-001 / requirement-impact.md | UF-001 | Draft / no design | Draft / no design | BEH-005; UC-007; REQ-007,009; AC-013; SCN-002,005,006; DEC-006,007 | Product Design Requested — continuation |

## SR-001 — Experimental manager/tool foundation analysis and UI brainstorming request
- Phase/classification: Requirements / Initial Baseline.
- Trigger: user's request to continue Projects/Tasks under disabled feature flag; public manager and optional Team; task tools and dependency-aware parallel delegation; analyze first, then Product Prototyper brainstorms UI directly with user.
- Evidence: investigation-notes.md E-001–014; current workspace e04cfef23550c3b78286a53befc6bd5d71fb1061; public agent repo committed inventory e08cacb4b54aa42d3fe72607a1b26f3b429e6104 (read-only).
- Prior requirements/design: N/A — new continuation package; historical released project-tasks approval not reused for new scope.
- Current requirements: Draft; design: N/A — not started, requirements not approved.
- Affected scenarios/behavior/requirements/ACs/decisions: all IDs in the initial baseline above.
- Scenario basis: existing capability/authoring/discovery/spawn paths supported by prior intent and source. New Project-scoped coordination supported as explicitly requested target, not approved complete semantics. Active-work deletion and ambiguous retry SCN-007 remain Unclear.
- Why recorded: first coherent requirements baseline for Product review/handoff, not fictional architecture completion.
- Canonical sections authored: all requirements and investigation sections; clear separation of evidence, proposed intent and deferred design.
- Supplements: product-design-handoff.md with full analysis/request context; external Product artifacts N/A — not yet received.
- Intended behavior changed: Yes — proposed extension only; production source/settings unchanged.
- Approval impact: initial requirements not approved. No exact approved baseline or behavior-defining supplements yet; user's instruction authorizes investigation/Product conversation only.
- Historical context: tickets/done/project-tasks and projects-concept-introduction remain read-only and separate identities.
- Design/review basis invalidated: N/A — no new design/review; future approved integration must deliberately reconcile old no-status/boundary assumptions.
- Completed task-size/architectural-risk: N/A — design not completed; no direct-implementation claim.
- Handoff result: Product Design Requested, purpose New Request; canonical product-design-handoff.md. Rule lookup/routing recorded there once resolved.
- Downstream impact: Product discussion first; no Architecture Reviewer/Implementation Engineer handoff yet.
- Remaining gaps: DEC-001–010; Product/user UI decisions, status/completion/dependency/linkage/flag policies and public-package scope; explicit requirements approval.
- Next action: Product Prototyper engages user in requested UI brainstorming; returns evidence/decisions for requirements refinement and explicit approval before architecture.


## SR-002 — Record UF-001 non-overlay primary Project forms
- Phase/classification: Requirements / Requirement Gap (new user direction to existing presentation), not a code/design correction.
- Trigger: Product Prototyper interim Requirement Impact UF-001, 2026-10-02; exact user feedback and screenshots in externally owned Product record.
- Original request continued: direct UI brainstorming following manager foundations analysis; no new implementation, phone delivery or global UI scope.
- Prior/current authority: SR-001 Draft → SR-002 Draft; full requirements approval absent; design N/A — not started. SR-001 artifacts preserved at local docs checkpoint cc565743e862b4b3fec8109b99c6fe21d13b1c0a; original handoff remains historical.
- Affected IDs: BEH-005; UC-007; REQ-007/009; AC-013 added without renumbering AC-001–012; SCN-002/005/006; DEC-006/007. DEC-009 remains open and unchanged in policy.
- Scenario basis: explicit user feedback against overlays for shown New/Edit Project forms; screenshot evidence E-016. No final primary Task detail/Manager treatment, phone support, deletion or cancellation scenario approved.
- Canonical edits: requirements status/behavior/scope/REQ/AC/scenario/UI/supplement/decision/traceability/readiness sections; investigation E-015–017, Product findings/provenance/supplement inventory and implications.
- User direction captured: primary New/Edit Project forms avoid overlay/modal presentation. Preserve manual authoring/data and existing destructive-action confirmation safeguards. Product alternatives (pages/inline/Task detail/Manager) remain unapproved.
- Intended behavior changed: Yes, constrained primary-form presentation in draft; production and prototype source unchanged by Solution Designer.
- Approval impact: UF-001 is explicit preference evidence via Product record, not full requirements or final UI/UX approval. Obtain complete baseline/supplement approval after Product review before architecture/implementation.
- Behavior-defining supplements: no final approved UI/UX supplement. Interim Product records/screenshots remain externally owned and linked; evidence revision c289b74b833cba02744dd926e992892bc6fd6407. No copying into a competing spec.
- Product provenance: accepted cumulative base df2f5cdaf9b168298dcae79ac47c11f31dd82d7c; existing source e9aa4a74ca36f62303bb7f5f0efd74bf89a9ea71 differs from source investigation e04cfef23550c3b78286a53befc6bd5d71fb1061. No new parity/future-state acceptance claimed.
- Design/review invalidation or completed task-size/risk: N/A — design not reached. No downstream technical handoff.
- Result/handoff: product-design-handoff-sr-002.md, Product Design Requested, purpose New Request (continuation of existing user-requested review, not Result Correction). Rule decision/receipt recorded in that file.
- Remaining gaps: replacement layout/route/navigation/cancel/focus decisions and other DEC-001–010 remain open; final UI/UX references/confirmation and explicit complete requirements approval missing.
- Next action: return constrained revised context to Product Prototyper; continue alternatives discussion with user. No automatic finalization or architecture progress.
