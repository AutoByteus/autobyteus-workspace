# API/E2E Revision Record — task-agent-several-tasks

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-002 Pass), round 1 | SR-003, SR-005, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 90% (API-F-001) |

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
