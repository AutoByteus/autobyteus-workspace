# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-21
- Trigger: implementation handoff IR-001 (Small / Low, direct route)
- Code tested: `5617257773` (code `014e281990`)
- AC-005 live: after a real switch from a scripted Antigravity era of 2,405 journal lines to a live runtime and one neutral message, Codex (2 runs) and native AutoByteus (1 run) read the named file in full before replying; the Claude Agent SDK (haiku twice, Sonnet once) read its start and its end and skipped the middle: recorded as FU-001, as the criterion prescribes.
- AC-001…AC-004, AC-006: reused IMP-01…IMP-04 (units on real rotation, built-server MS-01, gated switch e2e).
- Suites: server unit (8,633 pass, 1 suite-load failure outside the change's reach, FU-002), integration (509 pass, 5 watcher `ENVIRONMENT`), whole E2E (119 pass; the 9 failing files pass one at a time or are host timing, FU-003).
- Result: `Pass`, confidence 95.0%; route: delivery.
