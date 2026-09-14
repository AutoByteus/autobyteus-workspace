# Solution Revision Record — AORG-FOLLOWUP-20260914-001

## Revision Index
| Revision | Phase | Result / approval impact |
| --- | --- | --- |
| SR-001 | Requirements / Evidence | Draft Org restart baseline, no approval |
| SR-002 | Evidence | Backend-layer investigation, no intended change |
| SR-003 | Evidence | Mixed naming clarification, no intended change |
| SR-004 | Requirements | Org correction Ready for Approval; naming deferred |
| SR-005 | Requirements / Evidence | Explicit Org approval and satisfied conditional Team extension; approved behavior baseline |
| SR-006 | Evidence | Regression chronology, approved basis unchanged |
| SR-007 | Design | DS-REV-001 Ready, Medium/High; feature-base integration context confirmed; approved basis unchanged |

## SR-001 — Restart/resume eager activation investigation
- Phase: Requirements / Evidence; classification: Initial Baseline.
- Trigger: user cancelled API/E2E request, described restart → focus offline Org Agent → Send → all green and requested analysis against origin/personal.
- Prior: bootstrap-only Draft; no previous SR/design.
- Current: Draft proposed requirements, source analysis complete; design N/A.
- Findings: INV-R01–05 in restart-resume-analysis.md.
- IDs: BEH-001–003, REQ-001–003, AC-001–003, SCN-001–002.
- Canonical changes: requirements now capture reported scenario and proposed outcome; investigation appends source evidence index; new analysis supplement.
- Approval: analysis authorized; no approved change/design baseline. Prior completed ticket approvals not inherited. New work-driven restore behavior is proposed, not silently imposed on old scope.
- Review/design/size/risk: N/A before approval and completed design. No historical review invalidated.
- Route: lookup complete; no matching rule; analysis result returns to user, no API/E2E message sent.
- Remaining gaps: exact deployed runtime not reproduced; correction scope/approval and architecture work pending user direction.

## SR-002 — Team backend abstraction investigation
- Phase: Evidence; classification: evidence-only refinement / architecture-health assessment before design.
- Trigger: user requests explanation of FlatTeamRunBackend/TeamRunBackend single implementation, then explicitly confirms recording in this new follow-up ticket and continuing.
- Prior/current: requirements Draft remains Draft; no approved design exists.
- Findings: INV-B01–04 in team-backend-abstraction-analysis.md.
- Existing behavior/REQ/AC/SCN IDs: unchanged; no intended behavior changed.
- Canonical changes: investigation inventory appended; requirements authorize analysis context only and link new supplement; architecture assessment remains non-authoritative.
- Approval: investigation authorized, refactor not approved; no renewed approval needed for evidence alone. Later correction/design requires approved requirements.
- Scope: investigate historical reason, production callers, test seams and redundant forwarding; do not remove layers or merge this concern into restart causality.
- Prior independent review artifacts: historical references unchanged. New design/review/size/risk classification: N/A.
- Routing: current lookup complete, no matching rule; analysis-only return to user, no API/E2E message or delegation.
- Next: explain findings; user decides whether to request structural cleanup alongside or separately from restart correction.

## SR-003 — Mixed-runtime versus flat-topology clarification
- Phase: Evidence; prior/current: Draft, no design.
- Trigger: user questions renaming MixedTeamRunBackend and clarifies mixed backend meaning.
- Finding: INV-B05; per-runtime mixed meaning supported by documentation; topology and runtime variety independent; direct comparison shows near-identical moved/renamed wrapper.
- Artifacts changed: append evidence to team-backend-abstraction-analysis.md and investigation-notes.md, link clarification in requirements.
- Existing BEH/REQ/AC/SCN unchanged; no product behavior or authoritative design changes; no new approval inferred.
- Historical wording refined: changed class was largely renamed/moved, not newly invented mechanism. Keeping Mixed name technically viable.
- Design/review/classification N/A. Current rule lookup complete; no matching rule; return analysis to user. Next: user discussion, no rename performed.

## SR-004 — Narrow correction to Org restart/resume
- Phase: Requirements; refinement. User explicitly selects restart/resume bug and defers backend naming/structure.
- Prior: Draft. Current: Ready for Approval; exact baseline SR-004, no user approval recorded yet.
- IDs: REQ-001–003, AC-001–003, BEH-001–003, SCN-001–002 retained; no added behavior beyond the previously proposed work-driven continuation baseline.
- Canonical changes: scope guardrail and readiness in requirements; investigation user-decision evidence.
- Supplements: naming report remains historical investigation, explicitly not in correction scope; restart analysis remains cause evidence. No Product supplement.
- Approval impact: present precise intended correction and preserved history/identity/task constraints for explicit approval. No architecture/design work until approved.
- Design/review/task-size/risk: N/A before completed design. No prior review superseded.
- Routing: routine requirements-approval hold stays with user; no specialist handoff or API/E2E message.
- Next: user approval of the narrow basis, then architecture investigation/design and applicable route.

## SR-005 — Approval and confirmed standalone-Team extension
- Phase: Requirements / Evidence. Trigger: “Yeah, I approve.” and “if it has, we should also fix that” in the same direct user message, 2026-09-14.
- Prior: SR-004 Ready for Approval, Org scope. Current: Approved, Org + same confirmed Team defect. No design yet.
- Evidence: INV-R06 establishes Team fresh/restore mode switch and exact composer path. Source only, no new runtime validation.
- IDs: existing REQ-001–003 / BEH-001–003 / AC-001–003 / SCN-001–002 retained; REQ-004 / BEH-004 / AC-004 / SCN-003 express same approved continuation rule for Team; REQ-005 / BEH-005 / AC-005 / SCN-004 explicitly preserve existing fresh configured launch behavior.
- Approval: exact SR-004 basis explicitly approved; same-message Team extension expressly authorized conditional on finding same issue, now confirmed. No implicit naming/refactor/migration expansion.
- Artifacts: canonical requirements approval/scope/readiness updated; canonical notes and restart analysis add source parity evidence; previous entries unchanged.
- Design/review/risk classification: pending proportionate design; no forward-ready claim. Existing historical review artifacts remain historical only.
- Next: architecture investigation/design for both subject paths, preserving first-work binding durability and task lifecycle. Current routing lookup complete: no rule matches this parity/approval result; return to user. This is not Architecture Design Complete.

## SR-006 — Record original-personal regression chronology
- Phase: Evidence. Trigger: user asks to update investigation notes and reiterates old nested-Team behavior did not have this problem.
- Finding INV-R07: direct historical code confirms original refactor introduced eager preparation and later correction deferred only fresh creation. This substantiates why current restore differs from pinned origin/personal.
- Prior/current requirements: Approved at SR-005, unchanged behavior basis and IDs. No additional approval needed for evidence-only clarification. Design not completed.
- Artifacts: canonical investigation current-summary/chronology updated, historical bootstrap sections labeled; supporting restart report appended. No old records overwritten.
- Scope: both Team/Org correction remains; naming/abstraction remains deferred; no additional product obligations or migration.
- Validation: source/history inspection only, no live bisect or test execution.
- Routing: current lookup complete, no matching rule; investigation update returns to user, no specialist contact.
- Next: architecture design preserving work-driven readiness and existing durability/identity safeguards.

## Workflow clarification during SR-007 architecture investigation
User confirms unreleased feature-branch development and future merge-back target `origin/requirements/flat-agent-organization-model` after this ticket is complete. Requirements workspace/finalization context and canonical notes updated. Approved behavior baseline SR-005 is unchanged. No release, deployment, personal-branch integration or immediate push inferred. Architecture investigation is ongoing; no completed SR-007 design or handoff claimed yet.

## SR-007 — Complete lazy configured restore design
- Phase: Design; classification: initial technical design / bounded lifecycle and callback correction.
- Trigger: user go-ahead to fix after approval; unreleased feature-base / child-ticket merge-back clarification; AINV-001–006 post-approval source investigation.
- Prior requirements: Approved SR-005; current requirements: Approved, unchanged BEH/REQ/AC/SCN intent. Prior design N/A; current DS-REV-001 Ready.
- IDs mapped: REQ-001–005, AC-001–005, BEH-001–005, SCN-001–004; DS-001–006.
- Design decisions: configured scope assembly does not prepare unused workers on restore; first-work handle preserves complete adoption/replacement change through owning root durability before runtime publication; update strict context/current-binding planner; preserve real task readiness and fresh creation. No schema/migration/release work; no backend renaming or wrapper removal.
- Canonical changes: new design-spec.md and solution-handoff.md; investigation AINV inventory; requirements links/current status; cumulative history index.
- Approval basis: SR-005 exact user approval and conditional Team extension, reconfirmed by direct “We should fix the problem now” direction. No changed behavior-defining supplement and no renewed product decision needed.
- Data transition: existing current TeamV2/OrgV1 directly usable; no migration, no released-version compatibility machinery.
- Classification: Medium / High, 14 production files plus tests/docs within existing owners; high risk from shared binding-commit/lifecycle/durability contract, not release status or document volume.
- Current independent review artifacts: N/A — not yet produced; historical base reviews are not a pass for this design.
- Validation: source/history investigation and document consistency checks only; implementation/realistic tests pending assigned owners.
- Result: Architecture Design Complete; selected route /software_engineering_team/architecture_reviewer by current High-risk rule. Full rule/decision in solution-handoff.md; notification confirmed DELIVERED to architecture_reviewer_2990d705f7794417ac6dcb85c8836357.
- Next: independent architecture review if required by current matching rule, then implementation and executable validation per route. Eventual delivery merges into origin/requirements/flat-agent-organization-model, not personal, and no release/deployment is implied.
