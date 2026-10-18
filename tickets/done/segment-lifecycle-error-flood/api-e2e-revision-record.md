# API/E2E Revision Record — segment-lifecycle-error-flood

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, round 1 (CRR-001 Pass) | SR-002, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: live Claude and desktop proof of SCN-001; new gated live E2E

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, round 1
- Triggering finding or case IDs: none (Pass); AC-007 and the server-E2E coverage decision handed over
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-002, ARCH-REV-002, IR-001, CRR-001
- Why this baseline or coverage/execution revision was recorded: first API/E2E validation of the package
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/claude-self-started-turn-lifecycle.e2e.test.ts` (gated `RUN_CLAUDE_E2E=1`; idle and loaded variants per CLI; the loaded variant fails on base)
- Cases added, changed, removed, or rechecked: API-01..API-04 reused (IMP-01/02/03/05); API-05 new live E2E; API-06/06b/06c temporary base comparisons; API-07 existing live case; API-08 desktop journey (AC-007); API-09 not tested (optional)
- Commands, environment, fixture, or broader-validation delta: live Claude runs with `env -i PATH HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1`; isolated instance `iso-59932-7c13` from `isolated-app start --build`, stopped and data root removed

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, evidence `API-05*`..`API-08*`, probe `probes/claude-live-queue-lag.probe.test.ts`
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: Pass, 96% (no category below 95%)
- New or remaining failure IDs: none
- Recommended owner: code reviewer (proportional test-code review of the new live E2E file)
- Remaining risks, blocked evidence, or untested scope: AC-002's shape proven with scripted frames only; the durable live test emulates server load to trigger the race; API-09 (optional Codex turn) not run, ASM-001 covered by the full suites
