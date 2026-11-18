# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 (IR-002, direct route) | SR-001, SR-002, IR-001, IR-002 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — AGY ended tasks in the view (server and phone); FU-002 base vs branch again; docs links

- Triggering role, report path, and round: implementation engineer, `tickets/in-progress/followups-483-517/implementation-handoff.md` (IR-002), round 1.
- Triggering finding or case IDs: N/A (baseline).
- Related revision IDs: SR-001, SR-002, IR-001, IR-002.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: BTS-03 (`background-task-status-count.e2e.test.ts`) reads the view after the step exits; new phone case MSP-78 (`mobile-background-tasks-cases.mjs`).
- Cases: API-01 (+ negative control with the base monitor), API-02 (phone MSP-47/48/49/59/78), API-03/03b (FU-002 base vs branch; remaining failures alone), API-04 (link check), API-05 (typechecks); reused IMP-01..IMP-05, IMP-07.
- Commands, environment, fixture, or broader-validation delta: scripted AGY CLI; phone probe stack; machine load 53–146.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution report, test progress log, `follow-ups.md` (FU-004).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: None in scope; FU-001, FU-003, FU-004 (OS events beyond the shared wait under heavy load).
- Recommended owner: delivery engineer
- Remaining risks: file-event suites stay load-dependent above load ~100; AGY view after a turn Stop is unit-only.
