# API/E2E Revision Record

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (`CRR-001`), round 1 | `SR-003`, `SR-004`, `ARCH-REV-001`, `IR-001`, `CRR-001` | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: Task API e2e, 13 new browser cases, hermetic harness

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md`, implementation review round 1 (Pass 9.3/10)
- Triggering finding or scenario IDs: none. This is the initial round, covering the reviewer-listed browser coverage for AC-001–008, AC-010–012, narrow stacking and the Workspaces-tab regression.
- Related revision IDs: `SR-003`, `SR-004`, `ARCH-REV-001`, `IR-001`, `CRR-001`
- Why recorded: first completed API/E2E validation result for this package
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts`:
    - updated to stash and restore `ENABLE_*` (the released API-001 inherited `ENABLE_PROJECTS=true` from the developer shell);
    - API-006 now includes a Task;
    - added API-007 (Task contract), API-008 (cascade) and API-009 (released v1.4.86 file).
  - `autobyteus-web/tests/e2e/projects-feature-probe.mjs`: added E2E-014…026 (Task journeys, count, flag, two-pane navigation, keyboard, zh-CN, narrow stacking, released-file node C, mixed statuses, restart). `IR-001`'s adaptations of E2E-001…013 were reviewed and retained.
- Scenarios added, changed, removed, or rechecked: added API-007…009 and E2E-014…026; changed the API harness and API-006; rechecked E2E-001…013
- Commands, environment, fixture, or broader-validation delta:
  - Broader validation: `Required` and executed. Browser with nodes A, B and C, a real restart, three viewports, keyboard-only and zh-CN.
  - The released-shape `projects.json` fixture is seeded on node C between restarts.
  - Every `ENABLE_*` variable is scrubbed from spawned processes.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md` (sequences 1–20)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%. The post-repository score was 79%.
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - Non-blocking: after a Task is deleted, focus falls to `BODY`.
  - Delete count uses `openTaskCount` (carry to the admission ticket).
  - AC-009 was proven by unchanged code and existing suites, not by a live LLM team run.
  - Validation ran on macOS only.
