# API/E2E Revision Record — task-keys-and-dependencies

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer CRR-002 Pass, round 1 | SR-001–SR-003, ARCH-REV-003, IR-003, CRR-002 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: server, runtime, browser, desktop and real-model validation

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002), API/E2E round 1
- Triggering finding or case IDs: open coverage from the implementation handoff (AC-021, agent tool journeys, AC-025, AC-026, gated suites)
- Related revision IDs: SR-003, ARCH-REV-003, IR-003, CRR-002
- Why recorded: first completed API/E2E result
- Coverage decisions or durable test paths changed:
  - Added TKD-API-001 (`project-task-boundaries.e2e.test.ts`), TKD-AGY-001 (`task-existing-copy-assignment.e2e.test.ts`) and PT-E2E-017 (`projects-feature-probe.mjs`).
  - Updated outdated assertions to the approved behavior in `ad-hoc-task-delegation.e2e.test.ts`, `collaboration-prompt-wording.e2e.test.ts` (CPW-R3), `projects-feature-probe.mjs` (PT-E2E-006/007/009), `project-manager-ux-probe.mjs` (PMU-015) and `project-manager-ux-task-locator-cases.mjs` (PMU-020/021/024/025).
- Cases added, changed, removed, or rechecked: as above; temporary DSK-001..006 and LIVE-001
- Commands, environment, fixture, or broader-validation delta:
  - Isolated desktop: the installed 1.5.5-beta.1 wrote the upgrade data; the worktree packaged build upgraded it.
  - Scripted AGY runtime for the gated suites and probes.
  - LIVE-001 used the Claude Agent SDK with Claude Haiku 5.5 at the user's instruction (no ChatGPT/Codex).
  - Timing suites that failed under host load were compared base vs. ticket in a temporary base worktree: equal results.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test-case ledger (all sections)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.6%
- New or remaining failure IDs: none in scope. Follow-ups: FU-API-001 (stale RightSideTabs spec), FU-API-002 (team-run v1 upgrade E2E), FU-API-003 (PMU-008 stale step).
- Recommended owner: Code Reviewer, for proportional review of the changed durable test code
- Remaining risks, blocked evidence, or untested scope:
  - Migration I/O fault not reproduced on the desktop (MP-001).
  - The real model was checked on one model and one prompt.
  - OBS-001–004 (non-blocking).
