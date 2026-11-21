# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Fail`

- Date: 2026-11-21
- Trigger: implementation handoff IR-001 (Medium / Low, direct route)
- Code tested: `56c61c3ecb` (code `8850dc3f99` + `570aab87d2`)
- Result: `Fail`, AC-008 / REQ-008: under load the probe bound reports a time-out for a child that has exited, because its timer runs before Node processes the exit (`exitCode` still `null`; API-05b: timer at 7,720 ms for a 3,000 ms bound, exit at 7,730 ms). Preliminary `Design Impact` (the design prescribes the `exitCode` check). Owner: failure-origin review by `/code_reviewer`.
- AC-007 not proven on this host: the OS delivered no file events (measured before each run); recorded for the owner as a requirement question.
- Proven: AC-001, AC-002 (probe 41/41, desktop app 5/5), AC-003, AC-005 (three passes), AC-006. Server unit 8,626 tests and web 5,954 + 535 tests pass for this change.
- Next Round: server integration and E2E suites; API-05 and API-03 (SM-04) after the fix.
