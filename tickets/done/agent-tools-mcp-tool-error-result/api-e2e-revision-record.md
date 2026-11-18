# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-001, IR-001 | N/A | Pass / 97% |

## Revision Entries

### API-REV-001: Baseline. Configured MCP tool failures reach every runtime as `isError` results

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001), round 1
- Triggering finding or case IDs: N/A (initial)
- Related revision IDs: SR-001, IR-001
- Why this baseline was recorded: first completed validation result
- Coverage decisions or durable test paths changed: none by API/E2E
- Cases: API-01…04 reused (IMP-00, IMP-02, IMP-03, IMP-04); API-05 the e2e with all four gates in a clean env
- Commands, environment, fixture, or broader-validation delta: live Codex (throwaway `CODEX_HOME`) and Claude; native with LM Studio; AGY rerun clean

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution report
- Prior result and confidence: N/A
- Current result and confidence: Pass, 97%
- New or remaining failure IDs: none
- Recommended owner: delivery
- Remaining risks, blocked evidence, or untested scope: R-01 out of scope; the "tool gone at call time" race is unit-only
