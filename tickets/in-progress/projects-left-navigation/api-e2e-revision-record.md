# API/E2E Revision Record — projects-left-navigation

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 pass | SR-008, SR-009; ARCH-REV-003; IR-002; CRR-002 | N/A | `Fail` / 90% (AC-012) |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-004 pass of the CR-003 fix | IR-003; CRR-003, CRR-004 | `Fail` / 90% | `Pass` / 95% |

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

### API-REV-002 — Rerun after the CR-003 fix: Stop reflected in Projects mode

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-004 (targeted-delta pass of IR-003); API/E2E round 2.
- Triggering finding or case IDs: PLN-09 (round 1), CR-003.
- Related revision IDs: IR-003 (`60499aa479`, `c9972a1581`), CRR-003, CRR-004.
- Why recorded: round-2 rerun after the fix.
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs`.
  - PLN-09 also stops a Team run in Projects mode, restored outside the window so it has no live context there.
  - PLN-08 tolerates CORS-blocked fetches during the deliberate backend restart.
- Cases added, changed, removed, or rechecked:
  - Rerun by impact (`git diff --name-only 467cff24c0 fce0d2dee6`: only `stores/projectRunsStore.ts` and its spec, besides tests): API-04 Pass (10/10); API-05 Pass on the rebuilt app.
  - New API-07: the full web suite, 4921 tests.
  - Still valid: API-R01/R02/R04, API-01, API-02, API-03.
  - Reused: IMP-13's typecheck.
- Commands, environment, fixture, or broader-validation delta: ENV-3b, ENV-4b. The DMG step succeeded this time.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-04 PLN-09: Stop not reflected in Projects mode | Local Fix (confirmed as CR-003) | Fixed in IR-003: `projectRunsStore` re-reads after Agent, Team and Org Stop. Agent and Team Stop read stopped within 5 s | API-04 PLN-09 (round 2), API-07 |

- Canonical artifacts and sections updated: execution report (Round, Builds, Cases, AC proof, scorecard, result), test progress log, coverage investigation (round-2 note).
- Prior result and confidence: `Fail`, 90%.
- Current result and confidence: `Pass`, 95%.
- New or remaining failure IDs: none.
- Recommended owner: code reviewer (test-code review).
- Remaining risks, blocked evidence, or untested scope:
  - FU-007, FU-008 (existing, out of scope);
  - a recomposing runtime's `## Project` on restore is unit-tested only;
  - SCN-010 remote runs are covered by the shared scope key only;
  - Org Stop is covered by IR-003's store spec, not the browser.
