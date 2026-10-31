# API/E2E Test Progress — atomic-agent-run-creation (autobyteus-349)

Read this first when picking the run back up. Only add rows. **Temporary data roots only.**

- Execution coverage report: `api-e2e-execution-coverage-report.md`
- Planned cases: `api-e2e-coverage-investigation.md` § Planned Cases
- Run temp root: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ar349-api.0owf0P`

| Time | Case ID | Event | Result | Note |
| --- | --- | --- | --- | --- |
| 2026-10-31 21:26 | API-R1 | Completed | Pass | reused IMP-01..05: no code change since 93fa105819 |
| 2026-10-31 21:30 | API-00 | Completed | Pass | clean @1dca0e2ad6 and base @e87e6bb2b1 servers built |
| 2026-10-31 21:30 | API-01 | Started |  | ac001 clean + base |
| 2026-10-31 21:31 | API-01 | Completed | Pass | clean: codex ENOENT + unknown model -> errors returned, 0 rows, 0 dirs; base: 2 empty runs left |
| 2026-10-31 21:31 | API-02 | Started |  | ac003 bulk 300 on clean dist with temporary [349-DIAG] stage timing (backup in /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/ar349-api.0owf0P/diag-backup) |
| 2026-10-31 21:32 | API-02 | Completed | Pass | seeded startup: E1/E2 removed (row+dir, logged with title), CTX/COLLAB/MAY/STARTED/TASK/UNREADABLE kept; 300 bulk empty removed, 300 started kept; stage 4563 ms with 302 removals / ~600 runs, 124 ms next start |
| 2026-10-31 21:32 | API-02B | Completed | Pass | small rerun: index rows kept for all kept shapes (incl. unreadable); base also hides unreadable from listing (pre-existing); dist diag restored |
| 2026-10-31 21:32 | API-03 | Started |  | ac004 crash + stuck activation, relaunch new/base |
| 2026-10-31 21:36 | API-03 | Completed | FAIL | crash mid-activation leaves never-started runs with a system_instruction raw trace (+ stale run_metadata .tmp with startedAt) -> kept by the content rule, listed after relaunch (API-03/03B/03C/03D/03E); record-only leftovers removed; stuck-activation case leaves a started run (startedAt committed first) |
| 2026-10-31 21:36 | API-04 | Started |  | ac005 two-step |
| 2026-10-31 21:37 | API-04 | Completed | Pass | prepare -> first message -> started; restart keeps and lists it, no removal |
| 2026-10-31 21:37 | API-05 | Completed | Pass | 284 gated E2E 2 passed |
| 2026-10-31 21:39 | — | Completed | Fail | round result Fail (F-API-001 Requirement Gap: AC-004 crash leftovers kept); cleanup done |
