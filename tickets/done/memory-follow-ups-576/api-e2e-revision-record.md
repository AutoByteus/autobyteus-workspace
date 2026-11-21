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

## API-REV-002: round 2, `Pass`

- Date: 2026-11-21
- Trigger: IR-002 (SR-002: FU-008's bound learns the exit from its event and decides after `setImmediate`)
- Code tested: `3b39828501` (records `a4ed4455fa`); baseline fix `adda171de8`
- Prior failure (API-REV-001, AC-008): resolved. The Grok catalog test ran 10 times with a diagnostic: 7 bounds fired late (4.1–22.5 s for 3 s), each with the exit unseen at the timer and seen at the deferred decision, and all 10 passed (API-05c); the replay and AGY files pass three times each; SM-04 passes three times (CF-05).
- Rerun delta: API-00, API-03, API-05 rerun; API-07, API-08, API-13 new; the rest still valid (only `probe-time-bound.ts` changed). Baseline fix: the Grok compaction replay's `afterAll` limit (measured close blocking the loop up to 7.9 s).
- AC-007 per DEC-005: three Linux passes (API-13) and this host's named `ENVIRONMENT` failure (API-04).
- Result: `Pass`, confidence 95.0%; route: delivery (direct, Medium / Low).
- Follow-up added: FU-002 (server E2E files at default limits on a busy Mac).
