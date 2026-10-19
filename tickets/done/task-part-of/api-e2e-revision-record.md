# API/E2E Revision Record — task-part-of

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 Pass), round 1 | SR-004, SR-005, ARCH-REV-001, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: part-of server E2E, live cascade, browser probe and isolated desktop journeys

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `tickets/in-progress/task-part-of/code-review-report.md`, round 1.
- Triggering finding or case IDs: none (implementation review Pass, no findings); handoff Known Risks and Downstream Coverage Hints.
- Related revision IDs: SR-004 (requirements), SR-005 (design), ARCH-REV-001, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed: added `project-task-parts-live.e2e.test.ts` (gated), POF-API-001, API-011, POF-SEARCH-001; updated additive shape pins in `project-task-boundaries`, `projects-graphql`, `project-task-search`, `project-change-feed`, `project-task-context-files-delegation`, `task-existing-copy-assignment`; baseline fix of two timing races in the `project-manager-ux` probe (PMU-002, PMU-021).
- Cases added, changed, removed, or rechecked: API-00..API-09 added; REUSE-IMP-01..05 reused (no `src` change since `179ddb9f77`).
- Commands, environment, fixture, or broader-validation delta: server E2E clean env (ENV-1), gated scripted AGY (ENV-2), probe-owned browser stack (ENV-3), isolated Electron instance of the worktree build with a test data package (ENV-4).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-progress.md`.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96% (post-repository 89%).
- New or remaining failure IDs: none.
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: `TASK_PART_CLOSE_FAILED` partial-failure path unit-only (accepted, ARCH-REV-001); the tab inside Electron proven only on the same renderer in the browser (no runtime in the instance).
