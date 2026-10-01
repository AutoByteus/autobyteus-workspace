# Solution Revision Record

## Revision index
| ID | Phase | Trigger | Findings | Prior status | Current status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User screenshot/report and live reproduction, 2026-09-26 | N/A | N/A | Ready for Approval | SCN-001–003; BEH-001–003; REQ-001–003; AC-001–003 | Proposed fixed-path clarity baseline; approval pending. |
| SR-002 | Evidence | User asks why ID is needed in saved config, 2026-09-26 | N/A | Ready for Approval | Ready for Approval | BEH-001, REQ-001–003 | Confirmed ID is picker/inventory handle, while run config/execution uses path; no intended-behavior change. |
| SR-003 | Requirements | User reply “Yeah … i meant use the path,” 2026-09-26 | N/A | Ready for Approval | Approved | BEH-001–003; REQ-001–003; AC-001–003 | Approved path-authoritative, fixed saved-team presentation; new-launch ID use remains out of scope. |
| SR-004 | Design | Approved SR-003 basis and additional architecture investigation | N/A | Design N/A | Architecture Design Complete | BEH-001–003; REQ-001–003; AC-001–003 | Internal fixed-path/selector presentation boundary; Medium / Low. |

## SR-001 — Saved team workspace presentation baseline
- Classification: Initial requirements baseline. Prior requirements/design: N/A; current requirements Ready for Approval; design N/A.
- Trigger: User's confusion about warning above duplicate green path, independently reproduced in installed Electron app. Finding IDs: N/A.
- Scenario validity: Existing team Edit Config and member disclosure are supported normal user journeys; no synthetic/corrupt state premise.
- Canonical sections: Initial requirements, investigation evidence; no behavior-defining supplement or Product Design package.
- Intended behavior change: Proposed single neutral fixed-path display for saved team root/member, not yet authoritative.
- Approval: None. Exact approved requirements baseline: N/A. User decision DEC-001 pending.
- Design/review/routing impact and task-size/risk: N/A before design. Routine user approval hold; no downstream handoff.
- Remaining gap / next action: Ask user to approve or refine SR-001; after approval investigate architecture and complete design.

## SR-002 — Path versus workspace ID clarification
- Classification: Evidence-only clarification; user follow-up requested a deeper reason for ID use. No new behavior approved or proposed.
- Prior/current requirements status: Ready for Approval / Ready for Approval. Design: N/A / N/A.
- Affected IDs: BEH-001, REQ-001–003 and DEC-001 rationale; scenario validity unchanged.
- New evidence: Editable new-run picker uses ID to select registered metadata; launch records and backend TeamRunService use `workspaceRootPath`; saved team execution tree stores only path. Copy-to-new-run-draft is a separate path-to-metadata resolution flow.
- Canonical sections changed: Investigation source log, structural inventory and conclusion; requirements data-continuity/contract explanation. No supplement, prototype or intended behavior change.
- Approval: Still pending; no user approval inferred from question. SR-001 proposed behavior remains the decision point.
- Design/review/routing and size/risk: N/A until approval and design. No handoff; next action is explain findings and ask user whether to keep the narrow saved-page correction or request a broader path-first change.

## SR-003 — Approval of path-authoritative saved-team display
- Phase/classification: Requirements approval capture. Trigger: User's 2026-09-26 “Yeah … i meant use the path” reply to the proposed fixed saved-path behavior after ID rationale was explained.
- Prior/current requirements: Ready for Approval / Approved. Design: N/A / Draft to follow.
- IDs approved: SCN-001–003; BEH-001–003; REQ-001–003; AC-001–003; DEC-001. Scenario validity unchanged.
- Canonical sections changed: Requirements status, approval basis, outcome, assumption and decision. Investigation facts unchanged.
- Intended behavior: Approved path-based fixed value in saved team root/member settings, without unverified warning, duplicate success or disabled selector. No approval for workspace editing, ID removal from new-run picker, Agent Org/standalone changes, persistence rewrite, or backend availability checks.
- Supplements: User screenshot remains evidence only; no behavior-defining supplement or Product package.
- Review/routing: Architecture design may now proceed; classification N/A until completed design. No prior design or review invalidated.
- Next action: Complete architecture investigation and proportionate design against this approved basis.

## SR-004 — Path-authoritative UI design completion
- Phase/classification: Design completion on approved requirements, with post-approval architecture investigation in `investigation-notes.md`.
- Prior/current status: Requirements Approved / Approved; design N/A / Ready. No intended behavior change and no renewed approval needed.
- Affected IDs: BEH-001–003; REQ-001–003; AC-001–003. Scenario validity unchanged.
- Canonical changes: Added `design-spec.md`; extended investigation architecture findings. No behavior-defining supplement or Product artifact.
- Technical decision: Internal existing-run form model distinguishes fixed saved-Team path from selector-backed Agent Org workspace. Fixed variant reads the already-projected `effectiveConfig.workspaceRootPath`; render a focused read-only component, not a disabled ID picker. Remove Team's unconditional `historical-only` projection and old parallel workspace fields. Backend run path/schema and new-launch picker remain unchanged.
- Classification: `task_size=Medium`, `architectural_risk=Low`; multiple internal frontend files but no API, persistence, security, concurrency, deployment or ownership-boundary change. Escalate if implementation uncovers those impacts.
- Approval basis: SR-001 proposed behavior, SR-002 evidence clarification, user approval recorded SR-003. No earlier review artifact (`N/A — not applicable`).
- Handoff result: Exact rule lookup selected `/implementation_engineer` for completed Medium/Low architecture; direct implementation route (independent architecture review N/A). Result file: `solution-handoff.md`.
- Remaining gaps: None for design; downstream implementation and validation required.
