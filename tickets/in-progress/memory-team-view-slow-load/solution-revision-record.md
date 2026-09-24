# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user report + reproduction | N/A | N/A | Ready for Approval → Approved (user, 2026-09-24) | BEH-001–005, REQ-001–005, AC-001–006, SCN-001–003 | Approved |
| SR-002 | Mixed | User approval + direction to add an Agent Orgs memory tab and ensure a clean design | N/A | Requirements Approved (SR-001); no design | Requirements Approved (SR-002); design Ready | BEH-005–009, REQ-004 (refined), REQ-006–010, AC-005, AC-007–011, SCN-004–006 | Architecture Design Complete |
| SR-003 | Design | ARCH-REV-001 Pass with REC-001…004 (non-blocking); user asked why the review was not considered | REC-001…004 | Design Ready (SR-002), reviewed Pass | Design Ready (SR-003) | REQ-004, REQ-005, REQ-010; AC-005, AC-006, AC-011 | Design clarified; requirements unchanged |

## Revision Entries

### SR-001 — Memory Agent Teams slow load: baseline

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: User report 2026-09-24 with two screenshots; live reproduction against the Electron backend (:29695); read-only probe on the real memory dir.
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not yet created.
- IDs affected: BEH-001–005, REQ-001–005, AC-001–006, SCN-001–003, QR-001–002, DEC-001
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline presented for approval.
- Canonical sections changed: all (new)
- Supplemental artifacts: `investigation-notes.md`
- Prototype evidence: N/A
- Intended behavior changed: `No` (performance/navigation timing only; content preserved)
- Approval impact: Pending explicit user approval
- Supplement versions: N/A
- Design/review basis invalidated: N/A
- Task-size/risk classification: N/A before design
- Handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-001
- Next action: Obtain user approval, then produce `design-spec.md`.

### SR-002 — Agent Orgs memory tab + architecture design

- Phase and classification: Mixed (Requirements + Design), `Refinement` (user-directed scope addition) plus the first design.
- Trigger: User message 2026-09-24: "since you found the problem, now approved your requirement make sure we have clean design. we should also support agent org memory tab as well".
- Triggering finding IDs: N/A
- Prior status: Requirements SR-001 `Ready for Approval`; no design.
- Current status: Requirements `Approved` (SR-002); `design-spec.md` `Ready`.
- IDs affected: added BEH-006…009, REQ-006…010, AC-007…011, SCN-004…006, UC-004…006, QR-001/002 extended to orgs; REQ-004 and AC-005 refined to exclude the REQ-009/010 corrections; DEC-001 resolved (include the frontend fix).
- Scenario-basis changes: SCN-004…006 added as Supported Normal Scenarios (user direction; real org data under `memory/agent_orgs`).
- Why recorded: approval of SR-001, a new user-directed scope and design completion.
- Canonical sections changed: requirements (all tables); investigation notes (Meta, Architecture Investigation Findings); design-spec (new).
- Supplemental artifacts: none.
- Prototype evidence: N/A.
- Intended behavior changed: `Yes`. The Agent Orgs tab was added by the user's own direction. REQ-009/010 restore the intended outcome of existing member controls (blank name; badge and inspector pointing at different runs). They are disclosed in the result message; a user objection is handled as a `Requirement Gap`.
- Approval impact: SR-001 was approved explicitly. SR-002 org scope comes from the user's directive in the same message. REQ-009/010 are disclosed corrections.
- Supplement versions: N/A.
- Design/review basis invalidated: N/A (first design).
- Task-size/risk classification: `task_size=Large`, `architectural_risk=High` (additive GraphQL contract and a shared type rename; public location-service API changes with four external `resolveTeamMemberLocation` callers; a shared catalog core across two persistence families; about 30 files across server and web).
- Applied handoff-rule outcome / result-file reference: see `handoff-result.md` in this folder.
- Downstream and architecture-review impact: independent architecture review applies per the handoff rules.
- Remaining gaps: none blocking. RSK-001 (no caching) is accepted.
- Next action: route per the handoff rules.

### SR-003 — Incorporate architecture review recommendations

- Phase and classification: Design, `Refinement` (evidence/design clarification; not a `Design Impact`, because the review passed).
- Trigger: ARCH-REV-001 round 1 `Pass` with non-blocking REC-001…004 (`design-review-report.md`). The user then asked why the design review had not been considered. Solution Designer had only recorded the Pass notice and had not read the recommendations. This entry corrects that.
- Triggering finding IDs: REC-001, REC-002, REC-003, REC-004.
- Prior status: requirements Approved (SR-002); design Ready and reviewed Pass.
- Current status: requirements Approved (SR-002, unchanged); design Ready (SR-003).
- IDs affected: REQ-004/AC-005 (exact preserved team policy; precise equivalence exceptions), REQ-005/AC-006 (admission-consistent root-first resolution), REQ-010/AC-011 (search-matching effect), REQ-007/REQ-009 (presentational detail contract).
- Canonical sections changed: `design-spec.md`: Solution And Approval Basis; Interface Boundary Mapping (`resolveTeamMemberLocation`); Final File Responsibility Mapping (`CollaborationMemoryDetail.vue`); Change / Refactor Sequence (step 3 gate); new sections "Preserved Team Catalog Policy" and "Architecture Review Recommendations Incorporated".
- Intended behavior changed: `No`.
- Approval impact: none. The approved requirements basis is unchanged.
- Design/review basis: the reviewed approach is unchanged. REC-001 corrects an inaccurate "same contract" statement (root-scoped `listAgents` skips admission). The in-progress implementation already gates the root read on `listRootTeamRunIds()`, which is consistent with this revision.
- Task-size/risk classification: unchanged (`Large` / `High`).
- Applied handoff-rule outcome: see `handoff-result.md` (SR-003 section).
- Remaining gaps: none.
