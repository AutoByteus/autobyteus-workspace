# API/E2E Test Progress

Read it first whenever you pick the run back up. Only add rows.

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: the coverage investigation's Planned Cases (same case IDs)

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-24T17:24:19Z | API-01..API-04 | Completed | Pass | Reused IMP-00/01, IMP-02, IMP-03, IMP-04 (code unchanged since 1d49973440) |
| 2026-10-24T17:24:19Z | API-05 | Completed | Pass | IMP-05 failure cause confirmed: 3e3a7b08cc (in base 1138e8fbef) added AgentDefinitionService.getInstance() at agent-memory-explorer-service.ts:53; ticket touches neither file (FU-001) |
| 2026-10-24T17:24:19Z | API-06 | Started | | new E2E application-import-signed-out-recovery on the fix; log /tmp/ab238e2e/API-06-fix.log |
| 2026-10-24T17:24:00Z | API-06 | Checkpoint | | draft E2E fails on the fix: repair after sign-in stays QUARANTINED "currently reentering"; diagnosing (Rule 9) |
| 2026-10-24T17:30:30Z | API-06 | Completed | Fail | cause measured: reentry worker start refused by host REENTERING admission; identical on base sources (startup-loaded app, package reload + repair). Not caused by the change; breaks AC-003 outcome end to end. Draft test and repro moved to evidence; test tree clean |
| 2026-10-24T17:30:43Z | API-07 | Completed | Not Tested | deferred until failure-origin decision (rework would touch recoverParticipants used by import; journey includes reload) |
