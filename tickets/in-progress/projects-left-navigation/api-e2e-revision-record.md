# API/E2E Revision Record — projects-left-navigation

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 pass | SR-008, SR-009; ARCH-REV-003; IR-002; CRR-002 | N/A | `Fail` / 90% (AC-012) |

## Revision Entries

### API-REV-001 — Baseline: real delegation, browser and desktop journeys; Stop staleness in Projects mode

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, round 1 (CRR-002 pass of IR-002).
- Triggering finding or case IDs: code review's Residual Risks; the implementation handoff's "Not run".
- Related revision IDs: SR-008, SR-009, ARCH-REV-003, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: the first API/E2E round.
- Coverage decisions or durable test paths changed:
  - added `autobyteus-server-ts/tests/e2e/projects/project-run-history.e2e.test.ts`;
  - updated `tests/e2e/helpers/collaboration-root-harness.ts` (`startRoot` extra input);
  - added `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` with its package script;
  - added `components/workspace/history/__tests__/WorkspaceAgentOrgScopedRows.spec.ts`.
- Cases:
  - API-R01…R04 reused (IMP-01…07, IMP-10);
  - API-01 Pass;
  - API-02 Pass in scope (EXC-E2E-004 race, FU-007);
  - API-03 Pass;
  - API-04 Fail (PLN-09) with the other 9 cases passing;
  - API-05 Pass;
  - API-06 Pass.
- Commands, environment, fixture, or broader-validation delta:
  - scripted AGY throughout;
  - the probe runs under `env -i` and strips provider keys;
  - the isolated instance gets scripted AGY through its data root's `.env`;
  - the DMG step of `--build` failed on `hdiutil` (environment), so the unpacked app of the same build was used.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, `follow-ups.md` (FU-007, FU-008).
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 90%.
- New or remaining failure IDs: PLN-09. After Stop on a run with no live context in the window, Projects mode keeps the run shown running, with Stop, and blocks "Archive all", until a re-read. Workspaces mode shows it stopped.
- Recommended owner: implementation engineer (`Local Fix`), after failure-origin review.
- Remaining risks, blocked evidence, or untested scope:
  - FU-008 (existing): the page's run stream after a backend restart without a reload;
  - a recomposing runtime's `## Project` on restore is unit-tested only;
  - SCN-010 remote runs are covered by the shared scope key only;
  - under P, a copy holding Tasks of P and Q shows its current (Q) Task line.
