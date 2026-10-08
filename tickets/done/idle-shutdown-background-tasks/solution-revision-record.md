# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Project Task + user direction 2026-10-08) | N/A | N/A | Ready for Approval | BEH-001..006, REQ-001..005, AC-001..008, SCN-001..005, DEC-001..003 | Root cause confirmed; requirements presented for approval |
| SR-002 | Mixed | User question "do we still need it?" and decision "remove it" (2026-10-08); architecture design | N/A | Ready for Approval | Approved; design Ready | BEH-001/002/004/007/008, REQ-001..005, AC-001..006, SCN-001..004, DEC-001..004 | Idle shutdown removed entirely; design complete (Medium / High) |
| SR-003 | Mixed | User reversed SR-002 after the server-cost check; hybrid approved (2026-10-08); AR-N-003 cleanup | AR-N-003 | Approved (SR-002); design Ready; implemented, code-reviewed, API/E2E in progress | Approved (SR-003); design Ready; API/E2E stopped | BEH-001..004/006..008, REQ-001..006, AC-001..008, SCN-001..005, DEC-001..006 | Hybrid: no idle shutdown while background tasks run; undo SR-002 code (Medium / High) |

## Revision Entries

### SR-001 — Keep delegated runs alive while their background tasks run

- Phase and classification: Requirements, Initial Baseline
- Trigger: Project Task from `/project_task_manager` (2026-10-08) with report `problem-report.md`; user direction in the Solution Designer conversation (2026-10-08): "the agent shouldn't stop working just because being idle for a long time"
- Triggering finding IDs: N/A
- Prior status: N/A
- Current status: requirements `Ready for Approval`; design not started
- Affected IDs: BEH-001..006, REQ-001..005, AC-001..008, SCN-001..005, DEC-001..003
- Scenario basis: SCN-001 observed twice on 2026-10-08; SCN-002 from AGY code/docs
- Why recorded: first baseline for user approval
- Sections: all of `requirements-doc.md`; `investigation-notes.md` created
- Supplements: `problem-report.md` (evidence only)
- Product design: N/A
- Intended behavior changed: N/A (baseline)
- Approval impact: awaiting explicit approval and DEC-001..003
- Design/review basis: N/A
- Classification: N/A
- Handoff: none (approval hold in conversation)
- Remaining gaps: DEC-001..003; UNK-001, UNK-002 for architecture
- Next action: user approval, then architecture design

### SR-002 — Remove idle shutdown of delegated copies

- Phase and classification: Mixed (Requirement change by the user + design)
- Trigger: user, 2026-10-08: "do you know what is the reason of having this idle there? do we still need it? … when task is done, the resources are released. please check"; then "yes. i think we should remove it. lets go"
- Triggering finding IDs: N/A
- Prior status: requirements Ready for Approval (SR-001); no design
- Current status: requirements Approved (SR-002); design-spec Ready
- Affected IDs: requirements rewritten around removal: BEH-001/002/004/007/008, REQ-001..005, AC-001..006, SCN-001..004. Former REQ-004 notice (BEH-006, SCN-005, AC-006 of SR-001) moved out of scope (DEC-003 deferred, separate-ticket candidate). DEC-001/002 superseded by DEC-004
- Scenario basis: unchanged evidence; SCN-005 dropped from scope
- Why recorded: user changed intended behavior from "defer while background tasks run" to "remove idle shutdown"
- Sections changed: whole `requirements-doc.md`; investigation notes "Is Idle Shutdown Still Needed?" and "Architecture Investigation Findings" (AF-01..AF-18); new `design-spec.md`
- Supplements: none added
- Intended behavior changed: Yes
- Approval impact: approved 2026-10-08 ("yes. i think we should remove it. lets go"); baseline = requirements-doc.md at SR-002. DEC-003 not answered; recorded as deferred out of scope (user may re-add)
- Design/review basis: new design (none before)
- Classification: task_size Medium, architectural_risk High (removes a lifecycle/concurrency authority across three root kinds; LLM contract change)
- Handoff: see `handoff-architecture-design-complete.md`
- Remaining gaps: none blocking; R-1 test rework
- Next action: route per handoff rules
- Review outcome (recorded 2026-10-08): architecture review **Pass**, ARCH-REV-001 (covers SR-001 and SR-002), `design-review-report.md` and `architecture-review-revision-record.md` in this folder. The reviewer forwarded the package to `/software_engineering_team/implementation_engineer`. AR-N-001/002 are implementation notes. AR-N-003 (stale investigation-notes sections: Meta at SR-001, Requirement Implications, Notes For Architecture Design, RSK-002/UNK-*; requirements approval line cites AC-001..008 instead of AC-001..006) is optional editorial cleanup for the next solution revision. It changes no behavior or design.

### SR-003 — Hybrid: keep idle shutdown, skip it while background tasks run

- Phase and classification: Mixed — Requirement change by the user (reversal of SR-002), design revision, evidence additions
- Trigger: user, 2026-10-08, after the SR-002 architecture Pass and while API/E2E was running: "Do you think it will influence our server performance when it's not shut down? Is there a way that if [the] agent has a background task, then we don't shut down it? But for other ones, it still follows 10 minutes thing." Then "Is it possible? … how do we know that one agent has started one background task?"; "thats fine for other agent. if they do not send, then they do not create lets assume that. i think hybrid is better"; "lets use hybrid approach ask api e2e to stop first"
- Triggering finding IDs: AR-N-003 (editorial cleanup folded in)
- Prior status: requirements Approved (SR-002); design Ready (SR-002); ARCH-REV-001 Pass; implementation committed (`28afa0884`, `bf5889d03`); code review CRR-002; API/E2E in progress
- Current status: requirements Approved (SR-003); design-spec Ready (SR-003); API/E2E stopped by the Solution Designer at the user's request (message delivered 2026-10-08 to `/software_engineering_team/api_e2e_engineer`)
- Affected IDs: REQ-001..006, AC-001..008, BEH-001..004/006..008, SCN-001..005; DEC-001 decided (hybrid), DEC-004 reversed, DEC-005 (no time limit) adopted as presented, DEC-006 (non-reporting runtimes = none) decided
- Scenario basis: same evidence; SCN-003 (release after work ends) and SCN-005 (non-reporting runtimes) added
- Why recorded: intended behavior changed
- Sections changed: whole `requirements-doc.md`; whole `design-spec.md`; investigation notes Meta, RSK/UNK statuses, new "Server Cost Of Live Copies", new "Hybrid Feasibility And Design Findings" (HF-01..HF-08), rewritten "Requirement Implications" and "Notes For Architecture Design"; SR-002 sections marked as history (AR-N-003)
- Supplements: `evidence/baseline-before*` kept as AC-001 "before" evidence
- Intended behavior changed: Yes
- Approval impact: SR-002 approval and ARCH-REV-001, implementation, CRR-001/002 apply only to the SR-002 basis and are superseded. Approved baseline = requirements-doc.md at SR-003 (user, 2026-10-08, "i think hybrid is better", "lets use hybrid approach")
- Design/review basis invalidated: SR-002 design-spec (in git at `28afa0884`), design-review-report ARCH-REV-001, implementation IR-001/IR-002, code review CRR-001/002 and the stopped API/E2E round
- Classification: task_size Medium, architectural_risk High (shared backend contract and idle quiet predicate across all runtimes and roots; LLM text; large revert)
- Handoff: `handoff-architecture-design-complete.md` (SR-003 section)
- Remaining gaps: none blocking. DEC-005 can be revisited if the user wants a cap
- Next action: architecture review of SR-003
- Review outcome (recorded 2026-10-08): architecture review **Pass**, ARCH-REV-002 (SR-003), `design-review-report.md` / `architecture-review-revision-record.md`. The reviewer forwarded the package to `/software_engineering_team/implementation_engineer`. AR-N-003 is resolved and AR-N-002 is obsolete. AR-N-001 is carried to implementation: `prompt_engineering.md` l.250, `agent_tools.md` l.313–314 and the parity test still state the old rule.
