# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline | N/A | N/A | Ready for Approval | BEH-001..010; REQ-001..014; AC-001..013 | Presented to user with DEC-001..005 |
| SR-002 | Requirements | User feedback 2026-10-08: no status control in the app | DEC-003 | Ready for Approval | Ready for Approval | BEH-002; UC-001 (removed), UC-003; REQ-006 (withdrawn → display-only), REQ-007, REQ-012, REQ-014; AC-001..003, AC-011, AC-013; SCN-001 (removed), SCN-003 | App stays display-only; status changes only through agent tools |
| SR-003 | Requirements | User approval 2026-10-08 | DEC-001, DEC-002, DEC-004, DEC-005 | Ready for Approval | Approved | REQ-008, REQ-010, AC-008, AC-009; DEC-001/002/004/005 | Approved baseline; architecture design starts |
| SR-004 | Design | Architecture design complete | N/A | Approved; design none | Approved; design Ready | All REQ/AC (design mapping) | design-spec.md Ready; Medium / Low → direct implementation route |
| SR-005 | Design | User feedback 2026-10-08 on the implemented Cancelled row (screenshot) | N/A | Design Ready (SR-004) | Design Ready (revised) | REQ-008, REQ-010; AC-008, AC-009 (design only) | Cancelled lane becomes the last column after Done instead of a full-width row |

| SR-006 | Mixed | User decision 2026-10-08: rename CLOSED → CANCELLED | DEC-001, R-001 | Approved (SR-003); design Ready (SR-005) | Approved (renewed); design Ready (revised) | REQ-001, REQ-004, REQ-008..010; AC-001, AC-004..009; DEC-001 | Status renamed to CANCELLED / "Cancelled" to avoid DONE confusion |
## Revision Entries

### SR-001 — Initial requirements baseline for a Cancelled Task status

- Phase and classification: Requirements — `Initial Baseline`
- Triggering input: User request 2026-10-08 delivered as a Project Task by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001..010, UC-001..006, REQ-001..014, AC-001..013, SCN-001..006, DEC-001..005
- Scenario-basis changes: N/A (baseline). SCN-001 (user Close) is new behavior that revisits the earlier "only agents change status" decision (project-tasks REQ-003/DEC-001; project-manager-ux scope)
- Why recorded: First coherent baseline for user approval
- Canonical sections changed: all of `requirements-doc.md`, `investigation-notes.md` (created)
- Supplemental artifacts: None
- Product design evidence: N/A — not requested
- Intended behavior changed: N/A (baseline)
- Approval impact: Awaiting explicit user approval of the baseline and DEC-001..005
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-001..005; U-001 (migration conventions, architecture phase); R-002 external manager skill follow-up
- Next action: User decision/approval, then architecture design

### SR-002 — App stays display-only for status

- Phase and classification: Requirements — `Refinement` (user change to proposed intended behavior)
- Triggering input: User, 2026-10-08: "I'm not even thinking about the user will change the task status from the UI. It was just changed by the create and update task … the application itself is agent native … So I'm not thinking about the UI to support … change the status." and "currently the UI is just for displaying, right?" (confirmed yes)
- Triggering finding IDs: DEC-003
- Prior status: Requirements `Ready for Approval` (SR-001, not approved)
- Current status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-002 (now preserved: no user status control); UC-001 and SCN-001 removed; REQ-006 rewritten as "no status control; display read-only"; REQ-007 reopen through the tool only; REQ-012/REQ-014 wording; AC-001..003 rewritten agent-driven; AC-011, AC-013 wording; QR-001; ASM-001 resolved; DEC-003 resolved
- Scenario-basis changes: SCN-001 (user Close in app) withdrawn; closing is SCN-002 (agent, often on the user's chat request)
- Why recorded: User narrowed scope
- Canonical sections changed: Document Status, Problem And Desired Outcome, behavior table, actors, scope guardrail, requirements, acceptance criteria, scenarios, UI section, quality, assumptions, open decisions, traceability, architecture input, readiness
- Supplemental artifacts: None
- Product design evidence: N/A
- Intended behavior changed: `Yes` (narrowed: no app status control)
- Approval impact: Still awaiting explicit approval; DEC-001, DEC-002, DEC-004, DEC-005 still to confirm
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A (no design yet)
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A (approval hold)
- Downstream impact: N/A
- Remaining gaps: DEC-001, DEC-002, DEC-004, DEC-005
- Next action: User confirms remaining decisions / approves, then architecture design

### SR-003 — Requirements approved

- Phase and classification: Requirements — `Refinement` (decisions resolved; approval)
- Triggering input: User question on industry practice (web research: Jira hides resolved issues after 14 days with a link to all; GitHub close reasons completed/not planned, open by default; Linear separate Canceled category), then User, 2026-10-08: "Let's do not make it so complicated … Just have your design create a clean UI. I like your suggestion. Basically, to do in progress, down, and a small closed control next to the refresh button shows a closed [lane] on demand. Yeah."
- Triggering finding IDs: DEC-001, DEC-002, DEC-004, DEC-005
- Prior status: Requirements `Ready for Approval` (SR-002)
- Current status: Requirements `Approved`; design in progress
- IDs affected: REQ-008, REQ-010 (concrete presentation: hidden by default, "Cancelled (N)" toggle beside Refresh, Cancelled lane after Done, toggle absent when none); AC-008, AC-009; DEC-001/002/004/005 resolved
- Scenario-basis changes: None
- Canonical sections changed: Document Status, REQ-008, REQ-010, AC-008, AC-009, UI section, QR-001, Open Decisions, Readiness
- Intended behavior changed: `Yes` (proposals fixed as approved)
- Approval impact: Approved baseline = requirements-doc.md at SR-003; user quote above
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: N/A
- Remaining gaps: U-001 (migration conventions) for architecture; R-002 external manager skill follow-up
- Next action: Architecture investigation and design

### SR-004 — Architecture design complete

- Phase and classification: Design — `Initial Baseline` (design)
- Triggering input: Approved requirements at SR-003
- Triggering finding IDs: N/A
- Prior status: Requirements `Approved`; design not started
- Current status: Requirements `Approved` (unchanged); `design-spec.md` `Ready`
- IDs affected: all REQ/AC mapped to DS-001..DS-004 (no requirement change)
- Scenario-basis changes: None
- Canonical sections changed: `design-spec.md` (new); investigation notes: Meta, U-001 resolved, Architecture Investigation Findings
- Supplemental artifacts: None
- Intended behavior changed: `No`
- Approval impact: None; the SR-003 approval governs
- Affected design/review basis: N/A (first design)
- Post-design classification: `task_size=Medium`, `architectural_risk=Low`. About 30 files, all inside existing Projects owners. The additive enum value flows through existing contracts with no migration (Directly Usable). Closure lifecycle is reused unchanged. One bounded consolidation of duplicated status policy (server `task-status.ts`, web `taskStatusPresentation.ts`). The released-migration repoint is mandated by the guideline and behavior-preserving.
- Applied handoff-rule outcome: see `handoff-to-implementation.md` (Medium/Low → `/software_engineering_team/implementation_engineer`)
- Downstream impact: Direct implementation; implementation self-checks, code review per rules, and API/E2E validation still apply
- Remaining gaps: R-002 (external Project Task Manager skill) follow-up candidate
- Next action: Implementation

### SR-005 — Cancelled lane as the last column

- Phase and classification: Design — `Refinement` (user feedback on the design's layout choice)
- Triggering input: User, 2026-10-08, with a screenshot of the implemented full-width Closed row: "Why don't we just use a vertical column … the closed column is the last column? … why are we putting closed on the separate row under the other one? … Does Jira have that column?" Research: Jira keeps terminal states (Done with resolution Won't Do, or a Canceled status) in the single far-right column; Linear board columns are ordered by status with Canceled last.
- Triggering finding IDs: N/A
- Prior status: Requirements Approved; design Ready (SR-004)
- Current status: Requirements Approved (unchanged); design Ready (revised)
- IDs affected: REQ-008, REQ-010, AC-008, AC-009. The design mapping changed only; the approved text "a separate Cancelled lane after Done" is satisfied more literally
- Canonical sections changed: design-spec Solution Basis, Intended Change, Final File Responsibility Mapping (ProjectTaskBoard, TempTaskBoard), Concrete Examples, Key Tradeoffs
- Intended behavior changed: `No` (layout realization only, at the user's direction)
- Approval impact: None; SR-003 approval stands
- Post-design classification: unchanged (Medium / Low)
- Applied handoff-rule outcome: design revision sent to `/software_engineering_team/implementation_engineer` (Small/Medium + Low rule)
- Next action: Implementation adjusts the board layout

### SR-006 — Rename the status CLOSED → CANCELLED

- Phase and classification: Mixed — `Requirement Gap` (user change to an approved name) with a design follow-through
- Triggering input: Solution Designer raised the risk that LLMs (and people) read "closed" as "finished", which also collides with the existing wording that DONE "closes" a Task's workers. Options offered: CANCELLED (recommended), WONT_DO, keep CANCELLED. User, 2026-10-08: "We should do the change … Not closed. Closer has confused the meaning. We need to just cancel it. Cancel it is better." then "CANCELLED is better".
- Triggering finding IDs: DEC-001, R-001
- Prior status: Requirements Approved (SR-003); design Ready (SR-005); implementation of SR-005 committed (`814e41a26`); delivery DR-001 halted awaiting the revised package
- Current status: Requirements Approved (renewed by the user's explicit decision); design Ready (rename delta added)
- IDs affected: REQ-001 (name and labels), REQ-004 (tool enum/texts), REQ-008..REQ-010 (lane, toggle and labels), AC-001, AC-004..AC-009, DEC-001 (re-resolved), R-001 (resolved)
- Scenario-basis changes: None
- Canonical sections changed: requirements (all status-name mentions, Document Status, DEC-001, Architecture Input); design (Solution Basis, all status-name mentions, naming check, Persisted Data note, new "SR-006 Rename Delta", Risks); investigation notes R-001
- Intended behavior changed: `Yes` (status name and labels only; semantics unchanged)
- Approval impact: Explicit user approval of CANCELLED, 2026-10-08 (quotes above). Approved baseline = requirements-doc.md at SR-006
- Persisted data: `CLOSED` was never released, so no migration and no alias; unreleased test data with CLOSED is acceptable to lose
- Post-design classification: unchanged (Medium / Low); a mechanical rename over existing owners
- Applied handoff-rule outcome: sent to `/software_engineering_team/implementation_engineer` (Small/Medium + Low rule); handoff file section "Revision SR-006"
- Downstream impact: implementation → API/E2E → delivery DR-002. Delivery artifacts that mention Cancelled (docs-sync-report, handoff-summary, release-notes) need updating
- Remaining gaps: R-002 (external Project Task Manager skill) follow-up
- Next action: Implementation of the rename
