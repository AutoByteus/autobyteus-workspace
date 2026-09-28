# API/E2E Revision Record

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md` (`CRR-001`), round 1 | `SR-003`, `SR-004`, `ARCH-REV-001`, `IR-001`, `CRR-001` | N/A | Pass / 95% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md` (`CRR-003`, IR-002 review), round 2 | `SR-008`, `ARCH-REV-003`, `IR-002`, `CRR-003`, `DR-001` (rejected) | Pass / 95% (superseded UI) | Pass / 95% |

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

### API-REV-002 — Revalidation of the SR-008 UI (grid, full-width page, three-column board)

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tasks/tickets/in-progress/project-tasks/code-review-report.md` (round 2 — IR-002 review, `CRR-003`, Pass 9.3/10)
- Triggering finding or scenario IDs: none. This is a rework after the user rejected the two-pane build in `DR-001`. SR-008 supersedes REQ-006, 007, 009 and 016, and AC-002, 005, 007 and 011.
- Related revision IDs: `SR-008`, `ARCH-REV-003`, `IR-002` (`ae0cd4755`), `CRR-003`, `DR-001` (rejected; not to be finalized)
- Why recorded: `API-REV-001` validated a UI that is now superseded, so the approved behavior must be re-proven.
- Coverage decisions or durable test paths changed:
  - In `autobyteus-web/tests/e2e/projects-feature-probe.mjs`, `IR-002` restored E2E-001…013 to the v1.4.86 journeys and replaced my two-pane E2E-014…026 with board cases E2E-014…027. I reviewed and retained both.
  - I added E2E-028 (a width sweep over 760–1600 px, with the default and the 520 px panel) and E2E-029 (Back in the error state, and the 2-line description clamp), and corrected the header.
  - The server e2e is unchanged.
- Scenarios added, changed, removed, or rechecked:
  - Added E2E-028 and E2E-029.
  - Replaced the round-1 E2E-014…026 (two-pane) with the IR-002 board cases.
  - Rechecked everything else.
- Commands, environment, fixture, or broader-validation delta:
  - The server was rebuilt after merge `a0fd103af`.
  - Browser runs: probe run 1 (29/29), then two `pnpm test:e2e:projects` reruns (29/29 each).
  - Repository reruns: server 275, web 1184/1185 (1 pre-existing failure).
  - Localization guards pass.

#### Prior Failure Resolution

None. `API-REV-001` passed; its UI-specific evidence is superseded by SR-008.

- Canonical artifacts updated:
  - `api-e2e-coverage-investigation.md`: the round-2 section and its meta;
  - `api-e2e-execution-coverage-report.md`: rewritten for round 2;
  - `api-e2e-test-case-ledger.md`: sequences 21–25.
- Prior result and confidence: Pass / 95% (superseded UI)
- Current result and confidence: Pass / 95%. The round-2 post-repository score was 81%.
- New or remaining failure IDs: none
- Recommended recipient: `/code_reviewer` (fresh proportional test-code review)
- Remaining risks:
  - Non-blocking: focus falls to `BODY` after a Task is deleted.
  - The delete count uses `openTaskCount` (carry to Task admission).
  - The board stacks below a window width of about 1140 px with the default panel (approved behavior).
  - Delivery's stale docs must be redone.
  - AC-009 was not exercised in a live LLM team run.
