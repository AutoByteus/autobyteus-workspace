# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-23
- Trigger: implementation handoff IR-001 (Medium / Low, direct route)
- Code tested: `233f813d19` (HEAD `99a45cc1a0`, this stage's TESTING.md commit)
- On a fresh build, in a clean environment: the 11 non-live files the changes reach pass (both AC-001 upgrade files, the faithful-ledger users, `memory-collaboration-graphql`, six `restoreByMemberMessage` users); the live AGY user not run.
- Reused: IMP-01…IMP-15, including two clean whole server suites (AC-003).
- TESTING.md: the faithful-ledger rule (`99a45cc1a0`); FU-004 for the startup files not yet on it.
- Result: `Pass`, confidence 95.3%; route: delivery.
