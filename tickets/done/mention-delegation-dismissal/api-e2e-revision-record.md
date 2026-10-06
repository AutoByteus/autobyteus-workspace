# API/E2E Revision Record — mention-delegation-dismissal

The coverage investigation (`api-e2e-coverage-investigation.md`) and the execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative. This record holds one entry per completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer / `code-review-report.md` CRR-001 / round 1 | SR-003, SR-005, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: `@` delegation, ad-hoc Tasks and DONE by `task_id`, validated at the wire and live

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md` (CRR-001, Pass), round 1.
- Triggering finding or case IDs: C-09 (stale live probe, promoted to an API/E2E required item); the implementation handoff's Downstream Coverage Hints.
- Related revision IDs: SR-003 (requirements), SR-005 (design), ARCH-REV-002, IR-001, CRR-001.
- Why recorded: first completed API/E2E validation round.
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` (gated scripted-AGY server E2E, three roots).
  - Added 2 cases to `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` (AC-009, AutoByteus).
  - Rewrote `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` from "`@` adds a collaborator" to "`@` delegates; ad-hoc Task; DONE". F01 now covers an ineligible definition, since runnability is no longer checked at `@`; AC-012 now uses an agent-initiated bring-in.
  - Documented the gated suite and the probe in `TESTING.md`.
- Cases: R-00..R-07, B-01, B-02, L-CLAUDE, L-CODEX, H-DESKTOP (human-style journey in a freshly built isolated desktop app, added at the user's request) — all Pass; L-AUTOBYTEUS Not Tested.
- Commands, environment, fixture, or broader-validation delta: N/A (baseline).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, ledger, report, this record.
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95.4% (no category below 90%).
- New or remaining failure IDs: None. The F01 first-run failure was a harness false positive, fixed and rerun.
- Recommended owner: `/code_reviewer` for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope:
  - AutoByteus live model run not performed (no model without the user's data).
  - L01/L02 AGY crash cases not run.
  - Upstream residuals unchanged.
