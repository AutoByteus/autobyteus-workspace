# API/E2E Revision Record

## Revision Index

| Revision ID | Trigger / Round | Related Revisions | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | Implementation `IR-001` / Round 1 | `SR-002`, `IR-001`; ARCH/CRR N/A | `N/A` | `Pass / 96.9%` |

## API-REV-001 — Unified AgentOrg history row browser acceptance

- Trigger: direct Small / Low implementation handoff, round 1.
- Finding/scenario IDs: `R01`, `B01`–`B04`, `C01`; no failure finding.
- Why recorded: establishes the initial executable baseline for `AC-001`–`AC-005`.
- Coverage decision: rerun implementation's durable component/Pinia/Team regressions; add no API/E2E-owned durable test; execute real Chrome against isolated listening services and representative saved histories.
- Scenarios: exact one-control DOM, summary/icon pointer, Space/Enter/ARIA, active Stop/sibling/content preservation, Team comparator, persistence/no-inference and cleanup.
- Prior failure resolution: None — new ticket.
- Canonical artifacts: `api-e2e-coverage-investigation.md`, `api-e2e-test-case-ledger.md`, `api-e2e-execution-coverage-report.md`.
- Prior result/confidence: `N/A`.
- Current result/confidence: `Pass / 96.9%`.
- New/remaining failure IDs: none.
- Recommended recipient: `/software_engineering_team/delivery_engineer`.
- Residuals: Electron shell and provider inference are out of scope. A setup-only inherited live `DATABASE_URL` incident is recorded in `setup-isolation-correction.json`; all acceptance actions were rerun against the verified owned clone. Future runs must use process-level absolute overrides.

