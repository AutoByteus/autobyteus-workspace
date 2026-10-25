# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-296 (FU-003, FU-002 of autobyteus-238; user comment) | FU-003, FU-002 | N/A | Requirements Approved; Design Ready | BEH-001…005; REQ-001…006; AC-001…009 | Architecture Design Complete, Medium / High |
| SR-002 | Design | Architecture review ARCH-REV-001 (Fail, Design Impact) | AR-001, AR-002 | Design Ready (SR-001) | Design Ready (SR-002); requirements unchanged | BEH-001 (crashed-worker participant), REQ-001, AC-005, AC-008 | Revised design, Medium / High; back to architecture review |

## Revision Entries

### SR-001: Reentry returns apps to ACTIVE with the worker stopped; the quarantine names the reason

- Phase and classification: `Initial Baseline`
- Trigger: Task autobyteus-296 from `/project_task_manager`, 2026-10-24
- Triggering finding IDs: autobyteus-238 FU-003, FU-002
- Prior status: N/A
- Current status: requirements Approved; design Ready
- IDs affected: all (new)
- Scenario basis: SCN-001, SCN-002 Supported Normal; SCN-003 Supported Explicit Edge (named by the Task)
- Supplements: reproduction e2e and logs; `application-framework-design-findings.md` (report)
- Intended behavior changed: `Yes` (defects removed; the documented contract restored)
- Approval: the Solution Designer within the direction (the Task: "decide with the docs"), user informed, 2026-10-24
- Classification: `task_size=Medium`, `architectural_risk=High` (lifecycle order of a shared path)
- Handoff: see `solution-designer-handoff.md`
- Remaining gaps: findings 4–12 are for the user to decide
- Next action: architecture review

### SR-002: Stop always ends in `stopped`; `getDiagnosticsByApplicationId` removed

- Phase and classification: `Design Impact`
- Trigger: `design-review-report.md` ARCH-REV-001 from `/software_engineering_team/architecture_reviewer`, 2026-10-24
- Triggering finding IDs: AR-001 (Medium, blocking), AR-002 (Low)
- Prior status: design Ready (SR-001)
- Current status: design Ready (SR-002); requirements Approved (SR-001, unchanged)
- IDs affected: BEH-001 (crashed-worker participant), REQ-001, AC-005, AC-008; Change Scope, Removal plan, Target mapping, Risks, DS-003 note; investigation E-08 corrected
- Why recorded:
  - AR-001 is confirmed by reading `application-engine-controller.ts:202-206` and `application-engine-launcher.ts:145-168`. Without reentry's worker start, a crashed (`failed`, detached) worker would stay `failed` after a repair, and the invoker refuses `failed`. The response: a stop always ends in the base `stopped` status, so reentry still starts nothing (DEC-001) and the app's tools start the worker on demand. The stop is renamed `stopEngine`, and the architecture guard's anchor follows.
  - AR-002: the startup lifecycle asks `getSetupRequiredDetail` for each selected application. `getDiagnosticsByApplicationId` and its two test stubs are removed.
- Intended behavior changed: `No` (the design now realizes REQ-001 for the crashed-worker kind too)
- Approval impact: none (requirements unchanged)
- Classification: `Medium` / `High` unchanged (one more subsystem, `application-engine`, within the same lifecycle change)
- Handoff: `solution-designer-handoff.md` (SR-002 section) → architecture review
- Next action: architecture re-review
