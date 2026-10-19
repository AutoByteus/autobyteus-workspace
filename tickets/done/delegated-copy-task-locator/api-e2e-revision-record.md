# API/E2E Revision Record — delegated-copy-task-locator

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, round 1 | SR-002..SR-004, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: durable locate / summary journeys, fixture boundaries, desktop smoke

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-001 Pass), round 1.
- Triggering finding or case IDs: C-002 (held for evidence); coverage hints in the handoff and review.
- Related revision IDs: SR-002, SR-003, SR-004; ARCH-REV-001, ARCH-REV-002; IR-001; CRR-001.
- Why recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` (PMU-020..PMU-025), registered in `project-manager-ux-probe.mjs`.
  - Added `autobyteus-web/tests/e2e/fixtures/task-worker-boundaries.mjs`; used by five fixture probes. `onOpenTeamRun` added to five fixture pages.
  - Baseline fix: `task-agent-peer-sidebar-probe.mjs` answers `GetRunFileChanges`.
  - User-directed: `TESTING.md` rewritten as the global testing strategy with an update policy; 7 links repointed; 2 suite commands moved into their test headers.
- Cases added, changed, removed, or rechecked: added PMU-020..025; rechecked PMU-001..019, task-closure-tree BR-001..006/008/009/012/013, 8 fixture probes.
- Commands, environment, fixture, or broader-validation delta: probe-owned real stack with scripted AGY; Playwright `routeWebSocket` emulation of feed loss and stream delay; isolated desktop instance with scripted AGY in its own `.env`.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test-case ledger, this record.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none in scope. Pre-existing base failures reported: nested-team-aggregate-status NTAS-BR-002, background-agent-renderer-contention BG-BROWSER-004, team-activity-presentation (harness).
- Recommended owner: N/A (Pass). Base failures: their probes' owning work.
- Remaining risks: RSK-001 rerun after the aggregate-status rebase; AC-011 component-only.
