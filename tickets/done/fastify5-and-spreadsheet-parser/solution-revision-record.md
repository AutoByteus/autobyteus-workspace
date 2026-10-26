# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (PTM Task 2026-10-24) | N/A | N/A | Ready for Approval | BEH-001..007, REQ-001..013, AC-001..014, DEC-001..007 | Awaiting the user's DEC-001 and DEC-002 |
| SR-002 | Mixed (Requirements approval + Evidence) | User answer 2026-10-24; design-phase probe SD-06 | N/A | Ready for Approval | Approved | DEC-001, DEC-002, AC-003 | Approved; AC-003 corrected to the base behavior REQ-002 preserves |
| SR-003 | Design | Architecture design | N/A | No design | Design Ready | BEH-001..007; DS-001..006 | `design-spec.md` Ready; Medium / High |
| SR-004 | Mixed (Requirements + Design) | ARCH-REV-001 (Fail) | AR-001, AR-002 | Approved SR-002 / Design Ready SR-003 | Approved / Design Ready | BEH-007; REQ-010, REQ-011; AC-013; DEC-008; DS-006 | Hyperlinked cells shown as text; CSV-by-URL and hyperlink spec cases |

## Revision Entries

### SR-001 — Fastify 5 (server + gateway) and spreadsheet parser baseline

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task Manager delegation of 2026-10-24 (merged autobyteus-248 + autobyteus-249); autobyteus-229 follow-ups FU-001, FU-002, FU-007; this ticket's `evidence/SD-01`..`SD-05`
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..BEH-007, REQ-001..REQ-013, AC-001..AC-014, SCN-001..SCN-006, DEC-001..DEC-007
- Scenario-basis or scenario-validity changes: N/A (baseline)
- Why this baseline or revision was recorded: first coherent baseline for the user's decisions
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all)
- Supplemental artifacts added, changed or removed: added `evidence/SD-01`..`SD-03`, `SD-05`, `probes/sheetjs-roundtrip.cjs`, `probes/sheetjs-attr-escape.cjs`, `SD-04` (server trial: typecheck, unit, e2e with base comparison)
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: `Yes` (new requirements baseline)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: pending; DEC-001 and DEC-002 marked `Needs user`
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference, when a handoff occurred: N/A (approval hold in the user conversation)
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-001, DEC-002; ASM-001
- Next action: user answers DEC-001/DEC-002 → record approval (SR-002) → architecture design

### SR-002 — Requirements approved; AC-003 evidence correction

- Phase and classification: Mixed, `Refinement`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: the user's answer of 2026-10-24 ("What are you asking me? I think you are more professional than me now. … What is your suggestion then?"), delegating DEC-001/DEC-002 to the Solution Designer's recommendations; `evidence/SD-06` (MCP CORS probe)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements `Ready for Approval` (SR-001); no design
- Current authoritative requirements/design status: requirements `Approved`
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: DEC-001 → (a) GraphiQL off everywhere; DEC-002 → (a) SheetJS 0.20.3 CDN tarball, integrity-pinned; AC-003 reworded
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: approval capture; AC-003 had assumed "no Access-Control-* headers on MCP routes", but SD-06 shows base sends the cors plugin's headers (the route's `cors: false` never took effect). REQ-002 (preserve) is unchanged; AC-003 now states the observable base behavior it preserves
- Canonical requirements, investigation and design sections changed: requirements Document Status, AC-003, DEC-001, DEC-002, Readiness Check; investigation Architecture Investigation Findings
- Supplemental artifacts added, changed or removed: added `evidence/SD-06`, `SD-07`, `SD-08`, `probes/cors-order-probe.mjs`, `probes/excel-viewer-trial.diff`, `probes/ExcelViewerTrial.spec.ts.txt`
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: `No` (decisions settled as recommended; AC-003 corrected to the preserved behavior)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved baseline `SR-002`; User, 2026-10-24, quoted in `requirements-doc.md` Document Status
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A (design starts here)
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference: N/A
- Downstream and architecture-review impact: none yet
- Remaining gaps, assumptions or blocked decisions: ASM-001
- Next action: architecture design

### SR-003 — Architecture design

- Phase and classification: Design, `Initial Baseline` (design)
- Triggering user feedback, Product package, investigation evidence, or role/report/round: approved SR-002; architecture investigation (SD-06..SD-08)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: requirements Approved (SR-002); no design
- Current authoritative requirements/design status: requirements Approved (SR-002); `design-spec.md` Ready
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..BEH-007, REQ-001..REQ-013, AC-001..AC-014 mapped to DS-001..DS-006
- Scenario-basis or scenario-validity changes: none
- Why this baseline or revision was recorded: design complete
- Canonical requirements, investigation and design sections changed: `design-spec.md` (new); investigation Architecture Investigation Findings and inventory
- Supplemental artifacts added, changed or removed: see SR-002 (same round of probes)
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: `No`
- Approval impact, exact approved requirements baseline, who approved, and approval reference: unchanged (SR-002)
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: `task_size` Medium, `architectural_risk` High (framework major under every request; deployment and dependency-source changes; security boundaries); see design spec
- Applied handoff-rule outcome / result-file reference: `handoff-sr-003.md` (route recorded there)
- Downstream and architecture-review impact: architecture review of SR-003
- Remaining gaps, assumptions or blocked decisions: ASM-001; RSK-001..RSK-003
- Next action: hand off per the handoff rules

### SR-004 — Hyperlink cells and CSV via URL (ARCH-REV-001)

- Phase and classification: Mixed. AR-001 `Requirement Gap`; AR-002 `Design Impact`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: architecture review `ARCH-REV-001` (`design-review-report.md`, round 1, Fail) and `evidence/SD-09`
- Triggering finding IDs: AR-001, AR-002
- Prior authoritative requirements/design status: requirements Approved (SR-002); design Ready (SR-003)
- Current authoritative requirements/design status: requirements Approved (SR-004); design Ready (SR-004)
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-007, REQ-010, REQ-011, AC-013, DEC-008 (new); design DS-006, viewer example, spec case list, docs line, gateway README note (residual)
- Scenario-basis or scenario-validity changes: SCN-006 now explicitly includes hyperlinked cells (reachable, MP-001; confirmed by SD-09)
- Why this baseline or revision was recorded: the reviewer showed that hyperlinked cells were undecided. The Solution Designer reproduced the premise and found that `javascript:` targets also reach the DOM on base
- Canonical requirements, investigation and design sections changed: requirements Document Status, BEH-007, REQ-010, REQ-011, AC-013, DEC-008; investigation Architecture Findings and inventory; design Approval Basis, Evidence, Intended Change, Change Scope follow-ups, Behavior map, DS-006 spine/narrative, Off-spine, File mapping (viewer, spec, docs, gateway README), Examples, Tradeoffs, Guidance
- Supplemental artifacts added, changed or removed: added `evidence/SD-09-hyperlink-cells.txt`, `probes/sheetjs-hyperlink.cjs`; added FU-005 to `follow-ups.md`
- Product design evidence or product decisions incorporated: N/A
- Intended behavior changed: `Yes`. Hyperlinked cells show their text without a link (DEC-008)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: approved baseline SR-004. The delta was decided by the Solution Designer within the direction, because nothing that works today stops working: links already look like text, desktop clicks are blocked, and the change removes a script-execution path. The user was informed in the Solution Designer conversation on 2026-10-24. The SR-002 user approval stands for the rest
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: ARCH-REV-001's Pass for DS-001..DS-005 is unaffected (no change there); DS-006 revised
- Post-design task-size/risk classification and rationale changes: none (Medium / High)
- Applied handoff-rule outcome / result-file reference: `handoff-sr-004.md` → architecture reviewer (narrow re-review of the viewer delta)
- Downstream and architecture-review impact: re-review of AR-001/AR-002 resolution
- Remaining gaps, assumptions or blocked decisions: ASM-001
- Next action: architecture re-review. Outcome: ARCH-REV-002 Pass (2026-10-24); the reviewer forwarded the package to implementation
