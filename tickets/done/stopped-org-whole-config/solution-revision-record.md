# Solution Revision Record — ORG-STOPPED-WHOLE-CONFIG-20260917-001

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial user request and source investigation | N/A | N/A | Ready for Approval | BEH-001–005; REQ-001–008; AC-001–006 | Coherent whole-Org stopped Settings baseline prepared for explicit user approval |
| SR-002 | Requirements | User clarification and approval after SR-001 presentation | N/A | Ready for Approval | Approved | BEH-001–005; REQ-001–008; AC-001–006 | Whole-Org Team-parity and launch-form presentation baseline explicitly approved |
| SR-003 | Design | Architecture design against approved SR-002 | N/A | Requirements Approved / Design N/A | Architecture Design Complete | BEH-001–005; REQ-001–008; AC-001–006 | Medium / High whole-root configuration design ready for independent architecture review |

## Revision Entries

### SR-001 — Whole-Org stopped Settings baseline

- Phase and classification: Requirements / Initial Baseline and user-requested behavior change from the prior member-only ticket.
- Triggering user feedback: user reports that stopped Team Settings shows the complete Team configuration while stopped AgentOrg Settings shows only the clicked Agent, and requests complete AgentOrg configuration including global settings.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: prior ticket `ORG-STOPPED-CONFIG-20260917-001` is complete and intentionally member-only for Settings; no prior authority for whole-Org Settings.
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001–005; REQ-001–008; AC-001–006; SCN-001–005; DEC-001.
- Scenario-basis changes: establishes supported direct-Agent and mounted-Team member entry paths to one enclosing whole-Org editor, with normal hierarchical editing, lifecycle alternates, and continuity preservation.
- Why recorded: this materially changes intended behavior and cannot be treated as an implementation-only bug against the earlier approved member-only scope.
- Canonical sections changed: complete initial `requirements-doc.md` and expanded `investigation-notes.md`.
- Supplemental artifacts: user Team screenshot, prior ticket archive, and pinned personal source comparison recorded as read-only evidence.
- Prototype evidence or product decisions incorporated: none; no Product Design request.
- Intended behavior changed: `Yes` relative to prior ticket; whole-Org Settings supersedes exact-member-only Settings for configured Org members if approved.
- Approval impact: explicit user approval of SR-001 pending. No implementation/design authority claimed.
- Behavior-defining supplement versions and approval references: none.
- Affected design/review basis invalidated or rebuilt: prior delivered implementation remains historical; this new ticket needs a new design after approval.
- Post-design task-size/risk classification: N/A before design completion.
- Applied handoff-rule outcome: N/A; approval conversation remains with user.
- Downstream and architecture-review impact: no handoff until requirements approval and completed design.
- Remaining gaps: DEC-001 user approval. Technical ownership and task-size/risk remain architecture-phase work.
- Next action: present the concise baseline to the user and request explicit approval; after approval, record it and produce the design.

### SR-002 — Familiar AgentOrg launch-form presentation

- Phase and classification: Requirements / Refinement.
- Triggering user feedback: user stated that the UI should have no meaningful form difference from AgentOrg launch configuration, because seeing the same form again is the natural Team-consistent experience.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: SR-001 Ready for Approval; design not started.
- Current authoritative requirements/design status: SR-002 Approved; design not started.
- IDs affected: BEH-002, REQ-002, AC-001, UI/interaction requirements, ASM-001, DEC-001.
- Scenario-basis changes: none; SCN-001–003 now explicitly require the familiar AgentOrg launch-form structure for stopped-run configuration.
- Why recorded: form parity is user-visible intended behavior, not an implementation detail.
- Canonical sections changed: behavior table, REQ-002, AC-001, UI requirements, assumptions/open decision, and investigation evidence.
- Supplemental artifacts added/changed/removed: none.
- Prototype evidence or product decisions incorporated: direct user clarification; no separate Product prototype requested.
- Intended behavior changed: `Yes` — presentation parity is now explicit. Existing-run lifecycle and editable-field boundaries are unchanged.
- Approval impact: user approved the complete SR-002 baseline on 2026-09-17: “Yes ... when we click one individual agent ... it also loads the same configuration form for the whole agent team. So we should use the same behavior for AgentOg.”
- Behavior-defining supplement versions and approval references: none.
- Affected design/review basis invalidated or rebuilt: N/A; design not yet started.
- Post-design task-size/risk classification: N/A.
- Applied handoff-rule outcome: N/A; approval conversation remains with user.
- Downstream and architecture-review impact: none until approval and completed design.
- Remaining gaps: none in requirements.
- Next action: complete architecture investigation and design against the approved baseline.

### SR-003 — Whole-root existing-run configuration architecture

- Phase and classification: Design / Initial architecture baseline.
- Triggering evidence: approved SR-002 plus post-approval inspection of the AgentOrg launch form, existing-run editor/store, hierarchy policy, exact-member API, AgentOrg lifecycle manager, Team aggregate writer, and retained context publication.
- Triggering finding IDs: N/A.
- Prior authoritative requirements/design status: SR-002 Approved; design N/A.
- Current authoritative requirements/design status: SR-002 remains Approved; `design-spec.md` Ready.
- IDs affected: BEH-001–005; REQ-001–008; AC-001–006; SCN-001–005.
- Scenario-basis changes: none.
- Why recorded: defines the clean root-subject boundary, shared launch/existing form, recursive linked-scope planner, aggregate AgentOrg API/write contract, canonical publication, exact-member removal, and verification path.
- Canonical sections changed: architecture evidence appended to `investigation-notes.md`; complete `design-spec.md`; cumulative `solution-handoff.md`.
- Supplemental artifacts: unchanged and read-only.
- Prototype evidence or product decisions incorporated: approved same-form clarification; no Product prototype.
- Intended behavior changed: `No` relative to approved SR-002.
- Approval impact: no renewed approval required; design realizes approved behavior without changing its boundary.
- Behavior-defining supplement versions and approval references: none.
- Affected design/review basis invalidated or rebuilt: new design basis established; no prior review applies.
- Post-design classification: `Medium` / `High`. Several bounded files across existing web/server owners; High because of new public API, aggregate persisted write, concurrency/lifecycle and canonical publication.
- Applied handoff-rule outcome: fresh lookup selected the single `Architecture Design Complete` route for `architectural_risk=High` to `/software_engineering_team/architecture_reviewer`.
- Downstream and architecture-review impact: independent architecture review is required; implementation must not begin before a passing review and the reviewer's own rule-based handoff.
- Remaining gaps: independent review and downstream implementation/validation only; no requirement or design question remains.
- Next action: send the cumulative package to the single selected architecture-review recipient.
