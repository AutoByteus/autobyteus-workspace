# API/E2E Revision Record — task-comments

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` (CRR-001 Pass), round 1 | SR-013, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: comments over tools, GraphQL, search, live delegation, browser and isolated desktop

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `tickets/in-progress/task-comments/code-review-report.md`, round 1.
- Triggering finding or case IDs: none (review Pass, no findings); handoff coverage hints.
- Related revision IDs: SR-013, ARCH-REV-002, IR-001, CRR-001.
- Why this baseline was recorded: first API/E2E validation of the package.
- Coverage decisions or durable test paths changed: added `project-task-comments-live.e2e.test.ts` (gated), CMT-API-001, CMT-API-002, API-012, CMT-SEARCH-001; updated additive pins in `project-task-boundaries`, `projects-graphql`, `project-change-feed`.
- Cases added, changed, removed, or rechecked: API-00..API-09 added; REUSE-IMP-01..05 reused (no code change since `e014c349b8`).
- Commands, environment, fixture, or broader-validation delta: ENV-1..ENV-4 (see the report).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`; `follow-ups.md` (FU-003, FU-004 added).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96% (post-repository 90%).
- New or remaining failure IDs: none in scope. Out of scope: FU-003, FU-004.
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: AC-002 concurrency stays unit-proven (QR-001).
