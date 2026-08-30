# Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial investigation and coherent requirements baseline from the user's hierarchy complaint and two screenshots. | N/A | Draft — Requirements Visualization Needed | BEH-001–BEH-005; REQ-001–REQ-012; AC-001–AC-008; DEC-001–DEC-003 | Current behavior mapped to Workspace history; hierarchy, responsive, accessibility, density, and preservation requirements defined; exploratory visual comparison required before approval. |
| RER-002 | Product Experience revisions, explicit user approval, requirement-impact reconciliation, readiness, and routing assessment. | Draft — Requirements Visualization Needed | Approved — Direct Implementation Ready | REQ-002, REQ-003, REQ-005, REQ-008; AC-001–AC-008; DEC-001–DEC-003 | Approved printed file-tree UI/UX package integrated; all decisions resolved; Medium/Low no-structural-impact route selected for Implementation Engineer. |

## Revision Entries

### RER-001 — Initial nested-team hierarchy readability baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: User reported that a root team with nested subteams is difficult to understand in the current UI, could not determine whether color/font/display caused it, and supplied wide and narrow current-state screenshots.
- Prior authoritative status (`N/A` for `RER-001`): N/A.
- Current authoritative status: Draft — Requirements Visualization Needed.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-005`; `UC-001`–`UC-006`; `REQ-001`–`REQ-012`; `AC-001`–`AC-008`; `SCN-001`–`SCN-005`; `DEC-001`–`DEC-003`.
- Why this baseline or revision was recorded: Investigation established that the hierarchy exists structurally and nested disclosure works, but the current row language relies on subtle indentation and dense repeated metadata. A stable behavioral basis is needed for an interactive requirements comparison.
- Canonical artifact sections changed: All initial sections in `requirements-doc.md` and `investigation-notes.md`.
- Supplemental artifacts added, changed, or removed: Two externally stored user screenshots linked as current-state evidence; no requirements-owned visual artifact created.
- Prototype evidence or product decisions incorporated: No future-state prototype yet. Product Experience Evidence Gate selected `Requirements Visualization` to compare hierarchy grammar, team-node differentiation, and metadata density.
- User approval impact: No approval claimed. The visualizer must return for user clarification, after which the requirements package will be revised and presented for explicit approval.
- Downstream architecture or direct-implementation route impact: Routing assessment is deferred until requirements approval and readiness. Current evidence suggests a bounded frontend presentation change, but no route is classified yet.
- Remaining gaps, assumptions, or blocked decisions: `DEC-001` branch/group/hybrid treatment; `DEC-002` metadata density; `DEC-003` team-vs-agent styling.
- Next action or recipient: Apply dynamic handoff rules for `Requirements Visualization Needed`; Product Design & Prototyping should build a reviewable interactive comparison using the selected `autobyteus-web` frontend locator and return a review URL/artifact package to Requirements Engineering.

### RER-002 — Approved printed file-tree hierarchy and direct route

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Design & Prototyping returned `Prototype Completed + Requirement Impact` for `REQPKG-NTHUI-001`. On 2026-08-30 the user stated they were satisfied with and approved the hierarchy UI, font, color, and symbol and explicitly preferred the filled User group symbol over the outline trial.
- Prior authoritative status (`N/A` for `RER-001`): Draft — Requirements Visualization Needed.
- Current authoritative status: Approved — Direct Implementation Ready.
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-005`; `REQ-002`, `REQ-003`, `REQ-005`, `REQ-008` plus evidence for `REQ-001`–`REQ-012`; `AC-001`–`AC-008`; `SCN-001`–`SCN-005`; `DEC-001`–`DEC-003`.
- Why this baseline or revision was recorded: The approved Product package resolves every material visual decision, supplies normative UI/UX and final post-approval visuals, and provides exact Requirement Impact traceability. Canonical readiness and direct-route assessment can now be completed.
- Canonical artifact sections changed: Document Status; Requirements; UI, Interaction, and Experience; Supplemental Artifacts; Assumptions; Open Decisions; Traceability; Downstream Architecture Input; Readiness Check; Architecture Design Routing Assessment; investigation prototype findings/evidence/risks.
- Supplemental artifacts added, changed, or removed: Linked the Product-owned `ui-ux-spec.md`, user decision record, requirement-impact record, final `VIS-001`–`VIS-005` manifest, and browser validation. Current-state screenshots remain evidence. Withdrawn exploratory revisions are not part of the approval basis.
- Prototype evidence or product decisions incorporated: `DEC-001` printed file-tree rails with right-only non-crossing elbows/no cards; `DEC-002` responsive metadata; `DEC-003` filled User group icon/semibold configured teams, circular agents, separate transient bolt/dashed treatment; default-collapsed teams; orthogonal selection.
- User approval impact: Explicit approval is recorded from 2026-08-30 in `/home/autobyteus/workspace/autobyteus-web-prototype/tickets/done/REQPKG-NTHUI-001/user-decision-record.md`. No renewed approval gap remains.
- Downstream architecture or direct-implementation route impact: Readiness passed. Preliminary task size `Medium`, architectural risk `Low`, and no structural-impact trigger found. Route: direct Requirements-to-Implementation; architecture design/review artifacts are `N/A — not applicable`.
- Remaining gaps, assumptions, or blocked decisions: None in requirements. Production implementation, fidelity validation, and any implementation-discovered Design Impact remain downstream.
- Next action or recipient: Apply dynamic handoff rules for `Approved Direct-Implementation`; Implementation Engineer rechecks the route, implements the approved UI/UX package, and returns Design Impact or Requirement Gap if production evidence contradicts the approved basis.
