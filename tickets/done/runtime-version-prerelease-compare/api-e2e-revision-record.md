# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001 (direct route, round 1) | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: prerelease versions end to end, on the real dsh and the rendered page

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001), API/E2E round 1.
- Triggering finding or case IDs: N/A.
- Related revision IDs: SR-001, IR-001.
- Why recorded: first completed result.
- Coverage decisions or durable test paths changed: AR-14 in `agent-runtimes-graphql.e2e.test.ts`; full-version
  assertions in `deepseek-harness-live.e2e.test.ts` case 1; baseline fix (fifth runtime) in `agent-runtimes-graphql.e2e.test.ts`.
- Cases: API-00 reused (IMP-00/01/02); API-01…API-05 run.
- Commands, environment, fixture, or broader-validation delta: isolated desktop instance of this worktree's build.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution report, this record, progress log.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none (the stale four-runtime assertion, caused by autobyteus-387, fixed as a baseline fix).
- Recommended owner: delivery engineer.
- Remaining risks: RSK-001 (design); a stable dsh `0.2.2` does not exist yet, so its "Update available" on the real dsh is proven by the scripted runtime and unit tests.
