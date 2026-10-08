# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from Project Task Manager delegation (2026-10-08) | N/A | N/A | Ready for Approval | BEH-001..006; REQ-001..007; AC-001..007 | Presented to user for approval with DEC-001 |
| SR-002 | Mixed | User approval (DEC-001 = A) + architecture design | N/A | Requirements Ready for Approval; design N/A | Requirements Approved; design Ready | REQ-001..007; AC-001..007; DEC-001 | Architecture Design Complete; Small / Low |
| SR-003 | Design | Code review CRR-002 (Design Impact, user-directed) after API/E2E API-REV-001 DTL-003 failure | CR-FO-001, CR-FO-002, CR-FO-003 | Design Ready (SR-002) | Design Ready (revised) | REQ-005, AC-004 (design only); BEH-005 | Architecture Design Complete; Small / High → independent architecture review |
| SR-004 | Design | Implementation Design Impact DI-001 (IR-003 stopped before commit) | DI-001 | Design Ready (SR-003), ARCH-REV-001 Pass | Design Ready (corrected) | REQ-007 / BEH-002 preserved; REQ-005 / AC-004 | Keep `readiness_failure` as the conversation error card; Small / High → architecture re-review |

## Revision Entries

### SR-001 — Delegated Team copies start only the coordinator

- Phase and classification: Requirements — Initial Baseline
- Triggering evidence: Delegated task description; source investigation; user's persisted run data (`collaboration_tree.json`, `communication_messages.json` under the Project Task Manager run).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001..006, REQ-001..007, AC-001..007, SCN-001..005, DEC-001, DEC-002.
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline for user approval.
- Canonical sections changed: all (new).
- Supplemental artifacts: None.
- Product design evidence: N/A — not requested.
- Intended behavior changed: N/A (baseline)
- Approval impact: Pending explicit user approval and DEC-001 choice.
- Behavior-defining supplement versions: None.
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A
- Downstream impact: N/A
- Remaining gaps: DEC-001; U-001 (architecture).
- Next action: User approval, then architecture design.

### SR-002 — Approval and architecture design

- Phase and classification: Mixed — approval capture + initial design
- Triggering user feedback: 2026-10-08, user asked whether lazy activation is used elsewhere; answer: yes everywhere except fresh delegated Team copies. User: "I think this is clear because in other places we almost start the worker lazily. We should do it here. There's no exception here. Go, I think it's approved."
- Triggering finding IDs: N/A
- Prior status: Requirements Ready for Approval; design N/A
- Current status: Requirements Approved (SR-001 baseline, DEC-001 = A); design Ready
- IDs affected: DEC-001 decided (A); ASM-001 confirmed; U-001 resolved; R-001/R-002 accepted
- Scenario-basis changes: None
- Why recorded: Approval received; design completed
- Canonical sections changed: requirements-doc Status/Approval/DEC-001/Readiness; investigation-notes meta, risks, Architecture Investigation Findings (AINV-001..008); design-spec.md created
- Supplemental artifacts: None
- Product design evidence: N/A
- Intended behavior changed: No (DEC-001 resolved to the recommended existing state)
- Approval impact: Approved basis = SR-001 requirements with DEC-001 = A; reference: user message above
- Behavior-defining supplements: None
- Affected design/review basis: New design-spec.md
- Post-design classification: task_size=Small, architectural_risk=Low (reused lazy activation path, no contract/persistence/ownership change; removal of dead eager branch)
- Applied handoff-rule outcome: see handoff file `handoff-architecture-design-complete.md`
- Downstream impact: Implementation per design guidance
- Remaining gaps: None blocking
- Next action: Route per handoff rules

### SR-003 — One member start-failure step; DS-002 trace corrected

- Phase and classification: Design — Design Impact
- Trigger: `/software_engineering_team/code_reviewer` CRR-002 (`code-review-report.md`), reclassifying CRR-001 at the user's request; API/E2E API-REV-001 DTL-003 failure (`api-e2e-evidence/dtl-org-member-failure-probe.log`).
- Finding IDs: CR-FO-001 (resolved by this design), CR-FO-002 (DS-002 trace corrected), CR-FO-003 (bounded refactor designed).
- Prior status: Requirements Approved; design Ready (SR-002, Small/Low).
- Current status: Requirements Approved (unchanged); design Ready (SR-003, Small/High).
- IDs affected: REQ-005 / AC-004 realization; BEH-005 path; DS-002 corrected; DS-005 added.
- Scenario-basis changes: None (SCN-002 alternate outcome unchanged; FO-SCN-001 = SCN-002).
- Why recorded: Structural root cause (duplicated activation-failure handling, four failure channels) and wrong design trace.
- Canonical sections changed: design-spec meta, Task Size And Architectural Risk, DS-002 spine/narrative, new "SR-003 Design Revision" section; investigation-notes AINV-009..012.
- Supplemental artifacts: None.
- Intended behavior changed: No. Refinement beyond CR-FO-003: closed-input rejection reported as `AGENT_RUN_NOT_ACCEPTING_INPUT` without `error` status (preserves Task DONE behavior; not an activation failure).
- Approval impact: None; SR-001/SR-002 approved basis still applies. User approved the refactor direction (relayed by CRR-002).
- Affected design/review basis: IR-002 (`d30c11204`) superseded; API-REV-001 result stands as evidence; prior direct-route classification superseded.
- Post-design classification: task_size=Small (unchanged); architectural_risk=High (was Low) — shared member-activation path for all Teams/Orgs, client-visible code vocabulary change, internal event removal, prior wrong trace.
- Applied handoff-rule outcome: see `handoff-sr-003-design-revision.md`.
- Downstream impact: Independent architecture review, then implementation (replace IR-002), source review, API/E2E rerun.
- Remaining gaps: Separate cleanup ticket (user-agreed, not yet written) for the deferred items listed in the design revision.
- Next action: Route per handoff rules.

#### SR-003 review receipt (informational)

- 2026-10-08: `/software_engineering_team/architecture_reviewer` **Pass**, ARCH-REV-001 (SR-003 with SR-002 base, Small/High). Report `design-review-report.md`; record `architecture-review-revision-record.md`. Non-blocking implementation notes AR-NB-001..003 (second `readinessFailureCode` consumer in the indeterminate wrapper; closed-input detection and overlay to clear; keep `postMessage` behavior after a successful start unchanged). PREM-001: Task DONE race reachable, supports the closed-input branch. Reviewer delivered the implementation handoff itself; Solution Designer sends no duplicate.


### SR-004 — Keep the member conversation error card (DI-001)

- Phase and classification: Design — Design Impact (evidence correction)
- Trigger: `/software_engineering_team/implementation_engineer`, `implementation-design-impact-ir-003.md` (DI-001). IR-003 was stopped before commit; the WIP patch is `ir-003-wip-start-for-input.patch`.
- Finding IDs: DI-001
- Prior status: Design Ready (SR-003), ARCH-REV-001 Pass
- Current status: Design Ready (SR-004 correction); requirements Approved and unchanged
- IDs affected: REQ-007 / BEH-002 (preserved, which SR-003 would have broken); REQ-005 / AC-004 realization
- Evidence change: AINV-010 was wrong, superseded by AINV-013. `readiness_failure` has an implicit consumer that shows an error card in the member's conversation in every root.
- Decision: implementation option A. Keep the event as the conversation-card channel, emitted once by `initializeReady`, and make the adapter branch explicit with an exhaustive check. `startForInput` owns the typed result and the overlay. In the closed-input race, no card is emitted. Options B (drop the card, which would need user approval for a REQ-007 change) and C (move card emission into `startForInput`, which would change which failures get a card) were rejected.
- Intended behavior changed: No. The correction keeps approved behavior.
- Approval impact: None.
- Affected review basis: ARCH-REV-001 covered SR-003. SR-004 changes the design, so architecture review is repeated before implementation.
- Post-design classification: Small / High (unchanged).
- Applied handoff-rule outcome: `handoff-sr-004-design-correction.md`
- Next action: Architecture re-review, then implementation (the WIP patch can be reused).

#### SR-004 review receipt (informational)

- 2026-10-08: `/software_engineering_team/architecture_reviewer` **Pass**, ARCH-REV-002 (SR-004 with SR-003 and SR-002 base, Small/High). Report `design-review-report.md`; record `architecture-review-revision-record.md`. AINV-013 verified by type across all three roots' sinks and web `handleError`; option A accepted; PREM-001 extended to the card suppression; no new findings; AR-NB-001..003 still apply. ARCH-REV-002 records that ARCH-REV-001 accepted AINV-010 on a string grep. Reviewer delivered the implementation handoff itself; Solution Designer sends no duplicate.
