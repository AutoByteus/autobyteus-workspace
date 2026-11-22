# API/E2E Revision Record

One entry per API/E2E round. The current report is `api-e2e-execution-coverage-report.md`; the plan is `api-e2e-coverage-investigation.md`.

## API-REV-001: round 1, `Pass`

- Date: 2026-11-22
- Trigger: CRR-002 Pass (Large / High)
- Code tested: `1df7771aac` (HEAD `b220b6ce38`); test commits of this round `03e5d4b4b1`, `f23f0dc834`
- AC-007 live (LC-01): a Claude run on a test-owned Claude home whose saved session file was removed continued on the built server in a new session behind the REQ-004 line, with the hand-over notice first on its input, and answered with era 1's codeword from the journal; one `RUNTIME_SESSION_LOST` warning; an auth failure did not renew; the renewed session resumed with no second notice.
- RSK-003: a run stopped while busy resumed its saved session after a real restart, with no renewal (LC-02); the Claude live lifecycle family's restore case, made untrue by this change, now restores as production does (harness `verifyResumable`), negative control fails.
- AC-002 live for Codex (LC-03).
- Suites: unit 8,900 and integration 517 pass; whole E2E 126 pass, 2 cleanup races outside the change's paths (FU-002).
- Result: `Pass`, confidence 95.5%; route: test-code review by `/code_reviewer`.
