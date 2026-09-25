# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user report + reproduction | N/A | N/A | Ready for Approval → Approved (user, 2026-09-24) | BEH-001–005, REQ-001–005, AC-001–006, SCN-001–003 | Approved |
| SR-002 | Mixed | User approval + direction to add an Agent Orgs memory tab and ensure a clean design | N/A | Requirements Approved (SR-001); no design | Requirements Approved (SR-002); design Ready | BEH-005–009, REQ-004 (refined), REQ-006–010, AC-005, AC-007–011, SCN-004–006 | Architecture Design Complete |
| SR-003 | Design | ARCH-REV-001 Pass with REC-001…004 (non-blocking); user asked why the review was not considered | REC-001…004 | Design Ready (SR-002), reviewed Pass | Design Ready (SR-003) | REQ-004, REQ-005, REQ-010; AC-005, AC-006, AC-011 | Design clarified; requirements unchanged |
| SR-004 | Mixed | Code review CRR-003/CRR-004 reopening + API/E2E F-001 + user decisions | CR-002, CR-003 (resolved upstream), CR-004, CR-001 (subsumed), F-001 (superseded by REQ-012) | Requirements Approved (SR-002); design Ready (SR-003); code at bd8450984 | Requirements Approved (SR-004); design Ready (SR-004) | REQ-002, REQ-003, REQ-008 (superseded), REQ-009–012; AC-012–014; DEC-002–004 | Architecture Design Complete |

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

### SR-004 — (draft) Sources list ownership (CR-002) and org history scope (CR-003)

- Phase and classification: Mixed. `Design Impact` (user-directed structural improvement) that carries a small `Requirement Gap` (sources-refresh timing).
- Trigger: `/code_reviewer` CRR-003 (`code-review-report.md`). The user chose to "refactor it now, if it makes our codebase follows better design principles". The package was reopened at `bd8450984`. `/api_e2e_engineer` was notified to pause.
- Triggering finding IDs: CR-002 (in package), CR-003 (recommended separate ticket), CR-001 (subsumed by CR-002).
- Prior status: requirements Approved (SR-002); design Ready (SR-003); implementation reviewed Pass (CRR-001/002).
- Current status: requirements `Ready for Approval` for the SR-004 delta; `design-spec.md` Needs Revision (pending DEC-002/DEC-003).
- IDs affected: new REQ-011, AC-012, AC-013, DEC-002, DEC-003. REQ-002 and REQ-003 are sharpened by AC-012 (no sources request on navigation; loading state immediately).
- Canonical sections changed: requirements (Document Status, Requirements, Acceptance Criteria, Open Decisions); investigation notes ("SR-004 Investigation").
- Intended behavior changed: `Yes` (REQ-011 changes when newly imported sources become visible: on the home view instead of on any navigation).
- Approval impact: renewed explicit user approval is required before the SR-004 design and implementation.
- Design/review basis invalidated: the SR-003 frontend route-sync section (DS-004) will be revised. The backend design is unchanged unless DEC-003 widens scope.
- Task-size/risk classification: `Large` / `High`, unchanged (per the code reviewer; reconfirmed after design).
- Next action: user decisions on DEC-002 and DEC-003, then the SR-004 design, then architecture review per the handoff rules.
- SR-004 addendum (F-001): `/api_e2e_engineer` stopped round 1 with no verdict and reported F-001 (a Design Impact against REQ-008). The SR-002 mechanism selected members by address-based configured placement, which admits delegated task-team members at configured team addresses (22 on real org data; teams share the flaw, with 0 real instances). The REQ-008 wording is clarified to "by execution kind, never by address" for both families, with new AC-014. This follows the approved Out-of-Scope statement and needs no new product policy, but it is shown to the user with the SR-004 approval request because the team rule wording changed. The design will expose `executionKind` on located team/org agent executions and select `configured` + `task`. O-001 (admission count difference on the built server) stays with API/E2E.
- SR-004 addendum (2026-09-25, CR-004): `/code_reviewer` CRR-004 reported that `origin/personal` now carries the separately delivered CR-003 (unified run-history catalog policy, `b68847a8c`) and an overlapping team-memory one-read fix in the old structure (`49ce0d173`). Solution Designer verified this at `origin/personal` @ `589005470`. The user limited scope ("only a scoped refactoring"), so SR-004 = F-001 + CR-002 + the CR-004 integration. DEC-003 is resolved upstream. `design-spec.md` gained the section "SR-004 Revision": execution-kind member selection; route-sync source ownership; the merge resolution table (this branch's structure wins; remove `listTeamMemberLocationsFromTree`/`listAgentsInTree`/`configuredOnly`; the org source reads `AgentOrgRunHistoryCatalogService.listCatalogRows()` with a stored-only `withInactiveHistoryMutation` manager; the root-mismatch invariant is covered by schema validation plus a new test; rerun codegen; rerun the equivalence gate). Status: design complete as Draft, awaiting user approval of REQ-011 option (a), the REQ-008/AC-014 clarification and keeping REQ-009/010. Classification Large/High, unchanged. After approval: handoff per the rules (architecture review).
- SR-004 addendum (2026-09-25, user decisions): (1) REQ-012: the Memory explorer shows every agent run with memory in the run's execution structure, including task agents and task teams (user: "The memory should show all memory because they are real runs"). This reverses the F-001 exclusion direction; REQ-008's clarification is superseded. (2) DEC-004 resolved: memory directories not referenced by the execution tree (4, legacy nested-classroom test runs) are left out ("We don't do special things"). Design "SR-004 Revision → Delta 1" was rewritten: an additive `executionKind` + `groupPath` on member targets, and tree rendering. Still pending explicit confirmation: REQ-011 option (a) and keeping REQ-009/010.
- SR-004 final (2026-09-25): the user replied "go" after the recommendations (REQ-011 option (a); keep REQ-009/010). Requirements `Approved` @ SR-004; `design-spec.md` `Ready`. Classification unchanged: `task_size=Large`, `architectural_risk=High` (merge with certain conflicts; additive GraphQL `executionKind`/`groupPath`; location-API changes; frontend tree rendering and route-sync ownership). Handoff: see `handoff-result.md` (SR-004 section).
- SR-004 correction (2026-09-25, ARCH-REV-003 Fail: AR-001 Requirement Gap (text only), AR-002 Design Impact (text only); approach Pass). All contradictions were fixed in the canonical artifacts, not only in this log. Requirements: Out of Scope no longer excludes task-team members; REQ-004/AC-005/BEH-005/the Preserved boundary/the Desired outcome list REQ-012's additions and derived aggregates as exceptions; REQ-008 keeps its performance clause (only the member-selection sentence is superseded); BEH-010 defined; traceability for REQ-011/012 and AC-012…014; DEC-003 resolved; REQ-012 aggregate-effect approval recorded (disclosed before "go"; zero effect on real team data). Design: base sections aligned with the SR-004 deltas (see the design's "ARCH-REV-003 findings resolved" table); REC-005 ordering, REC-006 grouping by `teamRunId`, REC-007 entries-before-roots and the `589005470` re-validation baseline added. No intended-behavior change beyond the approved SR-004; classification unchanged (Large/High). Re-submitted for architecture review.
