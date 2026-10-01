# Solution Revision Record

Package identifier: `PROJ-CONCEPT-20260926-001` — `projects-concept-introduction`.
The current `requirements-doc.md`, `investigation-notes.md` and, once created, `design-spec.md` remain authoritative; this record indexes their changes and approval impact.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-003 | Design | `ARCH-REV-001` round 1 `Fail — Design Impact` (`design-review-report.md`) | `AR-001`, `AR-002` | Requirements Approved; design Ready (SR-002, review Fail) | Requirements Approved (unchanged); design Ready — Architecture Design Complete (`task_size=Large`, `architectural_risk=High`, unchanged) | `BEH-002`, `BEH-004`, `BEH-006`; `REQ-002`, `REQ-005`, `REQ-006`; `AC-002`, `AC-005` (protected, not changed) | Link-candidate policy + opt-in `WorkspaceSelector` prop; setting-key → capability refresh table; residual notes adopted; returned for narrow re-review. |
| SR-002 | Design | Architecture investigation and design after approval (2026-09-26) | N/A | Requirements Approved; design N/A | Requirements Approved; design Ready — Architecture Design Complete (`task_size=Large`, `architectural_risk=High`) | `BEH-001`–`BEH-006`, `REQ-001`–`REQ-014`, `AC-001`–`AC-012` (unchanged) | `design-spec.md` created; routed to independent architecture review. |
| SR-001 | Requirements | Initial coherent baseline from user request + two clarifications (2026-09-26); explicitly approved by the user the same day | N/A | N/A | Approved | `BEH-001`–`BEH-006`, `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`, `DEC-001`–`DEC-008` | Slice-1 Projects requirements (feature-flagged, description + described workspace links) approved as recommended (`APPROVAL-PROJ-CONCEPT-20260926-001`). |

## Revision Entries

### SR-001 — Feature-flagged Projects concept, slice 1 baseline

- Phase and classification: `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: User request 2026-09-26 to introduce a Projects concept behind a feature flag modelled on Applications; clarification that a Project has a description and linked workspaces each with a description; investigation located the exploratory `REQ-ATPTN-001` visualizer (RV-001…RV-033) and the Draft `RER-004` requirements package inside container `autobyteus-server-0` (both unpushed), plus the current Applications capability and workspace registry code.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Approved` (2026-09-26); design `N/A — not created`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: `BEH-001`–`BEH-006`, `REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`, `UC-001`–`UC-006`, `QR-001`–`QR-004`, `ASM-001`–`ASM-002`, `DEC-001`–`DEC-008`
- Scenario-basis or scenario-validity changes: Six proposed scenarios; `SCN-004` classified `Supported Explicit Edge Scenario` on the strength of the existing non-destructive workspace-removal contract; all others `Supported Normal Scenario (proposed; pending approval)`.
- Why this baseline or revision was recorded: First coherent requirements package used for user approval.
- Canonical requirements, investigation and design sections changed: All sections of `requirements-doc.md` and `investigation-notes.md` created.
- Supplemental artifacts added, changed or removed: Linked (not copied) the external Product-owned `REQ-ATPTN-001` exploratory package and the historical Draft `agent-team-project-task-navigation` requirements package; disposable screenshot copies in `/tmp/req-atptn-vis/` not promoted.
- Prototype evidence or product decisions incorporated: Projects as a peer primary-nav destination; Project = name + description; workspaces linked as resources, not identity (`VIS-021`, `VIS-111`). No prototype decision is treated as approved.
- Intended behavior changed: `No` (baseline)
- Approval impact, exact approved requirements baseline and user-approval reference: Approved baseline `SR-001` (`REQ-001`–`REQ-014`, `AC-001`–`AC-012`, `SCN-001`–`SCN-006`); user accepted all `DEC-001`–`DEC-008` recommendations after confirming toggle semantics match Applications and that Tasks are out of scope. Reference `APPROVAL-PROJ-CONCEPT-20260926-001` (conversation, 2026-09-26).
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A before design completion
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A — approval hold remains in the requirements conversation; no handoff.
- Downstream and architecture-review impact: Preliminary structural surfaces present (new GraphQL operations, new persisted subject, new route/module); formal `task_size`/`architectural_risk` classification deferred to design completion.
- Remaining gaps, assumptions or blocked decisions: None blocking. `UNK-001` ("task admission" meaning) is deferred to the Tasks slice; `RISK-001` (unpushed container-only prototype and requirements branches) is a user action outside this package.
- Next action: Architecture investigation and `design-spec.md`, followed by task-size/risk classification and routing.

### SR-002 — Architecture design for feature-flagged Projects (slice 1)

- Phase and classification: `Design` — `Initial Baseline` for design
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Requirements approval `APPROVAL-PROJ-CONCEPT-20260926-001`; architecture investigation recorded in `investigation-notes.md` › Architecture Investigation Findings.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: Requirements `Approved` (`SR-001`); design `N/A — not created`
- Current authoritative requirements/design status: Requirements `Approved` (unchanged); design `Ready`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none changed; design maps `BEH-001`–`BEH-006` to spines `DS-001`–`DS-005`.
- Scenario-basis or scenario-validity changes: None.
- Why this baseline or revision was recorded: First complete architecture package.
- Canonical requirements, investigation and design sections changed: `design-spec.md` created; `investigation-notes.md` Investigation Meta and Architecture Investigation Findings updated.
- Supplemental artifacts added, changed or removed: None.
- Prototype evidence or product decisions incorporated: Nav placement after `Nodes` (`VIS-111`, exploratory).
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline and user-approval reference: `SR-001` approval remains valid (`APPROVAL-PROJ-CONCEPT-20260926-001`).
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A (first design).
- Post-design task-size/risk classification and rationale changes: `task_size=Large` (new server subsystem + two resolvers + settings refactor; new web route family, components, stores, i18n, and migration of two existing capability stores/cards onto shared structures; ~40 files across server and web). `architectural_risk=High` (new additive GraphQL contract, new persisted subject, refactor of shared capability code used by Applications and Skill Improvement). Design-health: `Duplicated Policy Or Coordination`, bounded refactor now.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: `get_handoff_rules` matched the Large/High rule → `/architecture_reviewer`; result file `handoff-to-architecture-review-sr-002.md`.
- Downstream and architecture-review impact: Independent architecture review required before implementation.
- Remaining gaps, assumptions or blocked decisions: None blocking. `UNK-001` deferred to Tasks slice; `RISK-001` (unpushed container-only prototype/requirements branches) is a user action.
- Next action: Architecture review by `/architecture_reviewer`.

### SR-003 — Design revision for architecture review ARCH-REV-001

- Phase and classification: `Design` — `Design Impact`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: `/architecture_reviewer` `ARCH-REV-001`, round 1, `Fail — Design Impact`; report `design-review-report.md`; record `architecture-review-revision-record.md`.
- Triggering finding IDs: `AR-001` (Medium; `P-001` Reachable), `AR-002` (Low; `P-003` Reachable). `P-002` Unclear, drives nothing.
- Prior authoritative requirements/design status: Requirements `Approved`; design `Ready` (`SR-002`), review `Fail`.
- Current authoritative requirements/design status: Requirements `Approved` (unchanged); design `Ready` (`SR-003`).
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: none changed. Protected: `REQ-002`, `REQ-005`, `REQ-006`, `AC-002`, `AC-005`, `SCN-003`, `BEH-002`, `BEH-004`, `BEH-006`.
- Scenario-basis or scenario-validity changes: None.
- Why this baseline or revision was recorded: Resolve two in-scope Design Impact findings verified against the code.
- Canonical requirements, investigation and design sections changed:
  - `design-spec.md`: Solution And Approval Basis; Current-State Read; Architecture Investigation Evidence (3 rows); Primary Execution Spines (`DS-003` revised, `DS-004b` added); Spine Narratives (`DS-003`, `DS-004`); Ownership Map; Removal Plan (route-gate note, serverSettings refresh branch); Dependency Rules; Reuse Check; Final File Responsibility Mapping (`ProjectWorkspaceLinkDialog`, new `utils/projects/linkableWorkspaces.ts`, `WorkspaceSelector.vue`, `stores/serverSettings.ts`, `FeatureCapabilityToggleCard` `testIdPrefix`); Concrete Examples (2 rows); Change Sequence (steps 4–7); Risks; Guidance.
  - `investigation-notes.md`: SR-003 evidence table; meta revision.
- Supplemental artifacts added, changed or removed: None.
- Prototype evidence or product decisions incorporated: None.
- Intended behavior changed: `No`.
- Approval impact, exact approved requirements baseline and user-approval reference: `SR-001` approval (`APPROVAL-PROJ-CONCEPT-20260926-001`) remains valid; no renewed approval required.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt:
  - `ARCH-REV-001` Fail verdicts for `DS-003`, `DS-004` (Advanced path), the `ProjectWorkspaceLinkDialog` and `stores/serverSettings.ts` mapping rows, and the link-dialog example are addressed and need re-review.
  - Other `ARCH-REV-001` Pass verdicts are untouched.
- Post-design task-size/risk classification and rationale changes: None — remains `Large` / `High`. Adds 2 files (`utils/projects/linkableWorkspaces.ts`, a `WorkspaceSelector` prop) and 1 modified file (`stores/serverSettings.ts`).
- Decisions:
  - `AR-001`: option (a), narrowed. The Projects-owned policy `selectLinkableWorkspaceIds` (registered filesystem, not temp, not transient, not already linked) feeds one opt-in `WorkspaceSelector` prop `candidateWorkspaceIds` (default `null` = unchanged for the 7 run-config callers), with `autoSelectDefault=false`. Already-linked workspaces are excluded, because `SearchableSelect` has no per-option disabled state. The server stays authoritative.
  - `AR-002`: `CAPABILITY_STORE_BY_SETTING_KEY` in `stores/serverSettings.ts` with `ENABLE_APPLICATIONS` and `ENABLE_PROJECTS`; `ENABLE_SKILL_IMPROVEMENT` is excluded on purpose, so SI behavior is unchanged.
  - Residual notes adopted: validation inside the locked updater; route-gate table of `use…Store` functions; `testIdPrefix` preserves inner test ids.
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: `get_handoff_rules` → Large/High rule → `/architecture_reviewer`; result file `handoff-to-architecture-review-sr-003.md`.
- Downstream and architecture-review impact: Narrow re-review of `DS-003`, `DS-004`/`DS-004b` and the affected file mapping, as the reviewer suggested.
- Remaining gaps, assumptions or blocked decisions: None blocking.
- Next action: Architecture re-review.

#### SR-003 review outcome (informational)

- 2026-09-26: `/architecture_reviewer` `ARCH-REV-002` (round 2) — **Pass**. Covers `SR-001` + `SR-003`. `AR-001` and `AR-002` are resolved and were verified against the code. Report: `design-review-report.md`.
- The reviewer handed the reviewed package to `/implementation_engineer`, following its own rules.
- No Solution Designer re-handoff. No new SR round, because the solution basis did not change.
