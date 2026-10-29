# API/E2E Revision Record — task-agent-several-tasks

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-002 Pass), round 1 | SR-003, SR-005, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 90% (API-F-001) |
| API-REV-002 | Code reviewer, `code-review-report.md` (CRR-004 Pass, delta), round 2 | SR-006, ARCH-REV-003, IR-003, CRR-003, CRR-004 | Fail / 90% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: several open Tasks per copy end to end; desktop finding API-F-001

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `tickets/in-progress/task-agent-several-tasks/code-review-report.md`, round 1.
- Triggering finding or case IDs: none (review Pass); handoff Known Risks and coverage hints.
- Related revision IDs: SR-003, SR-005, ARCH-REV-002, IR-002, CRR-002.
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed: added `task-agent-several-tasks.e2e.test.ts` (gated); replaced the removed-refusal assertions in `task-existing-copy-assignment.e2e.test.ts` (rootScenario, EXC-E2E-004, TKD-AGY-001) with the accepted journeys; updated the `update_task` text pins in `project-task-boundaries.e2e.test.ts`.
- Cases added, changed, removed, or rechecked: API-00..API-07 added; REUSE-IMP-02..07 reused.
- Commands, environment, fixture, or broader-validation delta: ENV-1 (gated server E2E), ENV-2 (isolated desktop instance with a data package made by the worktree's server build).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, report, progress log; `follow-ups.md` (FU-002).
- Prior result and confidence: N/A
- Current result and confidence: Fail, 90% (post-repository 91%).
- New or remaining failure IDs: API-F-001 (the "Assigned to" help text states the old stop rule; AC-010).
- Recommended owner: Solution Designer (preliminary `Design Impact`), via failure-origin review.
- Remaining risks, blocked evidence, or untested scope: none besides API-F-001; FU-002 out of scope.

### API-REV-002 — Rerun of API-07 after the SR-006 help-line fix; API-F-001 resolved

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` CRR-004 (delta Pass), round 2.
- Triggering finding or case IDs: API-F-001 (CR-002).
- Related revision IDs: SR-006 (DEC-013, AC-011), ARCH-REV-003, IR-003, CRR-003, CRR-004.
- Why this revision was recorded: the web fix `1fa3a1d87e` changed `projects.root.help` (en, zh-CN).
- Coverage decisions or durable test paths changed: none (no server change; the catalog assertion is implementation's, IMP-09). The ticket-owned desktop journey now asserts the help line exactly in en and zh-CN (J2, J3, J6).
- Cases added, changed, removed, or rechecked: API-07 rerun (Pass); REUSE-IMP-09 added; API-00..API-06 kept on their round-1 runs (rerun by impact: `git diff --name-only a522089382 fc2a7c84ac` outside `tickets/` touches only the two web catalogs and their test).
- Commands, environment, fixture, or broader-validation delta: Electron rebuilt at `1fa3a1d87e`; a fresh data package made the same way.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-F-001 (API-07, AC-010) | Design Impact (confirmed CRR-003, CR-002) | Help line corrected (DEC-013); rendered on both Task pages in en and zh-CN | API-07 round 2 (J2, J3, J6), REUSE-IMP-09 |

- Canonical artifacts and sections updated: report (Round, Cases API-07 and REUSE-IMP-09, Finding, AC proof, scorecard, result), investigation (round-2 note), progress log, `evidence/API-07-desktop/README.md`, `evidence/API-07-desktop/run2/`, `evidence/API-07-r2-electron-build.log`.
- Prior result and confidence: Fail, 90%.
- Current result and confidence: Pass, 96%.
- New or remaining failure IDs: none.
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: a closed Task's root reads Offline while the same team works on another open Task (approved design, ARCH-REV-003); FU-001, FU-002 outside the ticket.
