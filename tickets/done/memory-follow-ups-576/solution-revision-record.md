# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-002 | Mixed | CRR-001 CR-001 (API-05 / API-05b) and the AC-007 question | CR-001 | Approved; Design Ready; API/E2E Fail | Approved; Design Ready | REQ-008, AC-007, AC-008, DEC-005 | Architecture Design Complete, Medium / Low |
| SR-001 | Mixed | Task autobyteus-576 (2026-11-21) | N/A | N/A | Approved (FU-004 pending DEC-004); Design Ready | REQ-001…008, AC-001…008, DEC-001…004 | Architecture Design Complete, Medium / Low |

## Revision Entries

### SR-001 — Baseline

- Trigger: Project Task autobyteus-576 (the autobyteus-554 follow-ups FU-002…FU-009, merged on the founder's instruction).
- Approval: Solution Designer within the direction; user informed 2026-11-21. DEC-004 (FU-004) was asked of the founder in the Solution Designer's conversation, with recommendation (a).
- Classification: `task_size=Medium`, `architectural_risk=Low`; direct implementation route.
- Next action: implementation (FU-009 first). FU-004 is recorded when answered.

### SR-002 — Probe bound decides by the exit event after the poll phase; AC-007 proof (CRR-001)

- `Design Impact` (CR-001): the SR-001 FU-008 design read the child's fields in the timer callback, before Node had delivered an exit that happened during a long main-thread block (API-05b: timer at 7,720 ms with `exitCode` null; exit at 7,730 ms). The revised design learns the exit from the `exit` event and defers the decision with `setImmediate`, past the same iteration's poll phase. AC-008 gains a real-order test: a real child exits while the main thread is blocked longer than the bound.
- AC-007: decided within the direction (DEC-005), user informed. The proof is a pass on a host whose OS delivers file events (Linux), plus the named `ENVIRONMENT` failure on the founder's Mac, whose FSEvents delivers nothing even to a raw `fs.watch`. A root restart of `fseventsd` or a reboot is recommended to the founder.
- Lesson: "explicit state check" must name when the state becomes true. In Node, a child's exit fields are set only when the exit event is processed.
- Next action: implementation (probe-time-bound only), then API/E2E (API-05 under load, SM-04, the integration suite, the whole E2E suite) and the test review.
