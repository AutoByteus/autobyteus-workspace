# API/E2E Revision Record — mention-candidates-in-run

The coverage investigation and the execution coverage report remain authoritative.

## Revision Index

| Revision ID | Trigger | Upstream IDs | Prior | Current |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer IR-001 (direct route), round 1 | SR-001, IR-001 | N/A | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Baseline: `@` offers and resolves definitions already in the run

- Trigger: `/implementation_engineer`, `implementation-handoff.md` (IR-001), round 1.
- Why: first completed validation round.
- Coverage changes:
  - `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` extended (in-run candidates and in-run `@`, 3 roots).
  - `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` updated: obsolete exclusion assertions replaced; copy checks; the reported scenario in S01.
  - `TESTING.md` updated.
- Cases: R-00..R-05, L-CLAUDE, H-DESKTOP — all Pass.

#### Prior Failure Resolution

None.

- Prior result: N/A
- Current result: `Pass`, 95.3% (no category below 90%).
- Remaining failure IDs: None.
- Recommended owner: `/delivery_engineer`.
- Residual risks / untested:
  - L01/L02 (AGY-only) not run.
  - AutoByteus runtime not run (no keys; the change is runtime-agnostic).
  - The focused member sees its own definition in the per-run menu (accepted design residual).
