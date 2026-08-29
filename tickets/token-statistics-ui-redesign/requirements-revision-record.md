# Token Statistics UI Redesign — Requirements Revision Record

The latest `requirements-doc.md` and `investigation-notes.md` remain authoritative.

## Revision Index

| Revision ID | Trigger / Round | Prior Status | Current Status | Affected Requirement / Behavior IDs | Result |
| --- | --- | --- | --- | --- | --- |
| RER-001 | Initial request, current-state/code investigation, and `origin/personal` bootstrap clarification | N/A | Draft — Requirements Visualization Needed | BEH-001–BEH-006; REQ-001–REQ-014; AC-001–AC-014; DEC-001–DEC-004 | Coherent requirements baseline and focused visualization decision set |
| RER-002 | Product Design returned clean Requirements Visualization RV-002 and corrected durable prototype baseline integration | Draft — Requirements Visualization Needed | Draft — Requirements Visualization Review Pending | No requirement text changed; DEC-001–DEC-004 remain open | Linked review URLs, repository lineage, visual evidence, validation, and limitations; awaiting user selection |
| RER-003 | User required current-data proof; Product Design returned RV-003 contract-feasibility audit and removed one unsupported illustrative field | Draft — Requirements Visualization Review Pending | Draft — Requirements Visualization Review Pending | REQ-012/no-backend boundary confirmed; DEC-001–DEC-004 remain open | Current-contract feasibility PASS; unsupported Run-details `Runs` count removed; no requirement impact |
| RER-004 | User selected a daily line/curve with visible point markers over vertical bars; Product Design returned RV-004 | Draft — Requirements Visualization Review Pending | Draft — Requirements Visualization Review Pending | BEH-003; REQ-015; AC-015; SCN-001; DEC-001 partially resolved | Daily trend form incorporated and validated; overall A/B/hybrid direction remains open |
| RER-005 | Product returned RI-001 after user rejected contributor ranking as primary and prioritized monthly/daily Tokens/Cost plus cache composition | Draft — Requirements Visualization Review Pending | Draft — Requirement Impact Decision Pending | BEH-003/006; REQ-002/004–006/012/016; AC-001/003–006/011/016; SCN-001–003/007; DEC-005–DEC-008 | Primary hierarchy revised; RV-004 blocked; four focused user decisions required before RV-005 |

## Revision Entries

### RER-001 — Initial professional Token Statistics UI baseline

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user rejected the current Token Statistics UI as ugly and unprofessional, supplied two populated Analytics captures, and explicitly required bootstrap from `origin/personal`.
- Prior authoritative status: `N/A`
- Current authoritative status: `Draft — Requirements Visualization Needed`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-014`; `AC-001`–`AC-014`; `SCN-001`–`SCN-006`; `DEC-001`–`DEC-004`.
- Why this baseline or revision was recorded: Code, tests, docs, prior approved artifacts, and supplied runtime captures provide a coherent current/preserved behavior basis. Material future-state hierarchy and interaction decisions remain visual and require an interactive exploration before approval.
- Canonical artifact sections changed: Initial full requirements document; investigation evidence; prototype decision; scope guardrail; readiness and deferred routing assessment.
- Supplemental artifacts added, changed, or removed: Linked both user-supplied current-state captures and the prior analytics UI/UX/data-contract artifacts. No Product-owned future-state artifacts exist yet.
- Prototype evidence or product decisions incorporated: Prior visual treatment is identified as superseded by the new user request; prior analytics semantics, no-content-header decision, and manual Settings navigation remain preservation constraints. Requirements Visualization is selected as the least-expensive next evidence.
- User approval impact: No future-state behavior approval yet. The `origin/personal` bootstrap source is explicitly confirmed.
- Downstream architecture or direct-implementation route impact: No engineering route is allowed before the visual decisions, requirements approval, readiness gate, and routing assessment.
- Remaining gaps, assumptions, or blocked decisions: `DEC-001` hierarchy, `DEC-002` control density, `DEC-003` exact-evidence presentation, `DEC-004` Run-details extent; `ASM-001`–`ASM-003` require confirmation.
- Next action or recipient: Apply dynamic handoff rules for outcome `Requirements Visualization Needed`; Product Design & Prototyping should bootstrap the selected frontend from pinned `origin/personal`, produce a review-ready interactive visualizer, and return its review URL/artifacts to Requirements Engineering for user clarification.

### RER-002 — Clean RV-002 visualization ready for user decision

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Design returned `Requirements Visualization Ready` revision `RV-002`, including clean product-only Direction A/B URLs, `VIS-001`–`VIS-008`, 15/15 Chromium validation, and a follow-up repository correction confirming the accepted baseline is durably integrated on the prototype repository's `origin/personal`.
- Prior authoritative status: `Draft — Requirements Visualization Needed`
- Current authoritative status: `Draft — Requirements Visualization Review Pending`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: Requirements and behavior text unchanged; `DEC-001`–`DEC-004` remain open; UI/Experience evidence and readiness metadata updated.
- Why this baseline or revision was recorded: The requirements clarification now has stable interactive evidence, durable Product-owned paths, and verified repository lineage, but the user has not selected a direction.
- Canonical artifact sections changed: Document Status; UI, Interaction, and Experience Requirements; Supplemental Artifacts; Readiness Check; Product Prototype Decision; Prototype Findings; Supplemental Artifact Inventory; Source Log.
- Supplemental artifacts added, changed, or removed: Added Product ticket, RV-002 brief/review, visualizer source, validation, and exploratory visual-reference directory. No Product artifacts were copied or recreated.
- Prototype evidence or product decisions incorporated: Direction A illustrates focused hierarchy/collapsible filters/expandable evidence; Direction B illustrates always-visible dense controls/ledger-first evidence. RV-001 review chrome is rejected and removed. No A/B decision is incorporated yet.
- User approval impact: None. Product correctly records `Awaiting User Review`; neither exploratory direction is normative.
- Downstream architecture or direct-implementation route impact: No change; engineering routing remains prohibited until user clarification, any final prototype, explicit approval, readiness, and routing assessment.
- Remaining gaps, assumptions, or blocked decisions: User must choose A/B/hybrid and resolve filter disclosure, exact-evidence pattern, and Run-details unification under `DEC-001`–`DEC-004`.
- Next action or recipient: User reviews `http://127.0.0.1:3262/?direction=focus` and `http://127.0.0.1:3262/?direction=dense`; Requirements Engineering records the decision and decides whether to request Final Prototype mode.

### RER-003 — Current-contract feasibility proof and unsupported-field correction

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user required explicit proof that the proposal can be implemented with the current data structure and must not invent unavailable fields. Product Design returned RV-003 with feasibility audit `FA-001`, contract validation `PASS`, and browser validation 16/16.
- Prior authoritative status: `Draft — Requirements Visualization Review Pending`
- Current authoritative status: `Draft — Requirements Visualization Review Pending`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: No requirement behavior changed. The existing `REQ-012` and no-backend-change boundary are confirmed; `DEC-001`–`DEC-004` remain open.
- Why this baseline or revision was recorded: The exploratory presentation now has field-level evidence against the required source pin, preventing downstream reliance on invented data.
- Canonical artifact sections changed: Document Status; UI/Experience revision references; Supplemental Artifacts; investigation Source Log; Product Prototype Decision; Prototype Findings; Supplemental Artifact Inventory.
- Supplemental artifacts added, changed, or removed: Added `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/implementation-feasibility-audit.md` and `validation/contract-feasibility-audit.txt`; updated RV-003 review/validation records.
- Prototype evidence or product decisions incorporated: The remaining proposal is achievable with current analytics and Run-details contracts. The initial illustrative Run-details model `Runs` count is unsupported by `TokenUsageRuntimeModelStatisticsRow`/`GET_TOKEN_USAGE_STATISTICS` and is removed rather than derived from hierarchical task rows.
- User approval impact: The feasibility clarification is satisfied, but no visual direction or final requirements approval is claimed.
- Downstream architecture or direct-implementation route impact: No backend/GraphQL/persistence change is required by the remaining proposal. Final routing still awaits user selection, final prototype decision, approval, and readiness assessment.
- Remaining gaps, assumptions, or blocked decisions: User selection of Direction A/B/hybrid and `DEC-001`–`DEC-004`.
- Next action or recipient: User reviews the unchanged clean Direction A/B URLs and selects the desired hierarchy/control/evidence/Run-details direction.

### RER-004 — Daily usage trend form clarified

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: The user stated that usage per day within a month should be a line/curve with visible point markers rather than vertical bars. Product Design returned RV-004 with both directions updated and browser validation 17/17.
- Prior authoritative status: `Draft — Requirements Visualization Review Pending`
- Current authoritative status: `Draft — Requirements Visualization Review Pending`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-003`; new `REQ-015`; new `AC-015`; `SCN-001`; `DEC-001` partially resolved.
- Why this baseline or revision was recorded: This is a material visual-behavior decision that governs the primary within-month trend and is now explicit/testable rather than an implementation preference.
- Canonical artifact sections changed: Current/desired behavior; Requirements; Acceptance Criteria; Scenario SCN-001; UI/Experience revision; Open Decisions; Traceability; Readiness; investigation evidence/prototype findings.
- Supplemental artifacts added, changed, or removed: Product-owned RV-004 review, validation, and `VIS-001`/`VIS-002` were updated in place; no Requirements-owned UI artifact was created.
- Prototype evidence or product decisions incorporated: A 29-point daily line with visible markers, restrained date guides, emphasized exact labels, full accessible series, no vertical bars, and no area fill. Current-contract feasibility from RV-003 remains intact.
- User approval impact: The daily trend form is clarified and included in the Draft approval basis; this is not approval of the overall requirements or either direction.
- Downstream architecture or direct-implementation route impact: No new backend/contract surface; current `trendBuckets` DAY granularity supports the behavior. Final routing still awaits overall selection and approval.
- Remaining gaps, assumptions, or blocked decisions: Direction A/B/hybrid; remaining hierarchy, control disclosure, exact-evidence treatment, and Run-details unification choices.
- Next action or recipient: User reviews the revised A/B visualizations and selects the remaining direction.

### RER-005 — Cache-efficiency priority requirement impact

- Triggering user feedback, prototype package, downstream feedback, or investigation evidence: Product Design returned Requirement Impact `RI-001` after the user stated that `Dominant driver`/`Usage drivers` are unintuitive and non-primary, monthly/daily Tokens/Cost and cache-aware token composition are primary, and prior-period percentage comparison may not be useful.
- Prior authoritative status: `Draft — Requirements Visualization Review Pending`
- Current authoritative status: `Draft — Requirement Impact Decision Pending`
- Requirement, behavior, acceptance-criteria, scenario, or decision IDs affected: `BEH-003`, `BEH-006`; `REQ-002`, `REQ-004`–`REQ-006`, `REQ-012`, new `REQ-016`; `AC-001`, `AC-003`–`AC-006`, `AC-011`, new `AC-016`; `SCN-001`–`SCN-003`, new `SCN-007`; `DEC-001`/`DEC-003` superseded in part; new `DEC-005`–`DEC-008`.
- Why this baseline or revision was recorded: The feedback changes which existing data is primary and conflicts directly with the RV-004 first-view hierarchy. Product Design cannot safely create RV-005 until Requirements Engineering resolves optional retention and terminology.
- Canonical artifact sections changed: Problem/success; current/desired behavior; stakeholders/use cases; Requirements; Acceptance Criteria; scenarios; UI/Experience; Supplemental Artifacts; Open Decisions; Traceability; Readiness; investigation prototype/evidence/risks.
- Supplemental artifacts added, changed, or removed: Added Product-owned `/home/autobyteus/workspace/autobyteus-web-prototype-worktrees/REQPKG-TSUI-001/tickets/in-progress/REQPKG-TSUI-001/requirement-impact.md` (RI-001). RV-004 remains retained as exploratory evidence but is marked blocked from final use.
- Prototype evidence or product decisions incorporated: Removed dominant contributor and driver terminology from the primary requirements; made monthly/daily Tokens/Cost and cache-aware token composition primary; made prior comparison and identity grouping conditional/secondary; recorded precise current-contract cache/input semantics.
- User approval impact: The primary priority clarification is incorporated in the Draft basis. Four material choices remain unapproved: contributor detail, prior comparison, input label, and identity grouping.
- Downstream architecture or direct-implementation route impact: No backend/GraphQL/persistence/accounting change is needed; all preferred facts exist at the source pin. No engineering handoff is allowed while the requirement impact is unresolved.
- Remaining gaps, assumptions, or blocked decisions: `DEC-005` remove vs optional contributor detail; `DEC-006` remove vs optional/neutral comparison; `DEC-007` Standard vs Uncached input label; `DEC-008` secondary grouping controls. `DEC-002` filters and `DEC-004` Run-details extent remain for visualization review.
- Next action or recipient: Ask the user the four focused RI-001 decisions. After resolution, update the canonical package and send a focused Requirements Visualization revision request for RV-005 to Product Design.
