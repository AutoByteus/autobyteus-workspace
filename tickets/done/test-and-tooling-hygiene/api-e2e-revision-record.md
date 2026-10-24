# API/E2E Revision Record — test-and-tooling-hygiene (autobyteus-253)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation engineer, `implementation-handoff.md` (IR-001), round 1 | SR-001, SR-002, IR-001 | N/A | `Pass` / 95% |

## Revision Entries

### API-REV-001 — Baseline validation of the 13 hygiene items on the direct route

- Triggering role, report path, and round: implementation engineer, `tickets/in-progress/test-and-tooling-hygiene/implementation-handoff.md`, round 1 (head `959b5cc048`, code `af81b3d7d2`)
- Triggering finding or case IDs: N/A (baseline); the handoff asked for the broad server E2E folder (shared-foundation `type-graphql` bump) and API/E2E's own validation
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-001, SR-002; IR-001; architecture review and code review N/A (direct `Medium` / `Low` route)
- Why this baseline was recorded: first API/E2E result
- Coverage decisions or durable test paths changed: none; all relevant existing durable tests `Still Valid`; two temporary probes kept under `evidence/probes/` (API-11, API-14), not committed as tests
- Cases added, changed, removed, or rechecked: API-01…API-05 reused implementation checks (code unchanged since); new API-10, API-10b, API-11…API-19, API-21; API-10b and API-13 added during the round when API-10 showed 93 gated files
- Commands, environment, fixture, or broader-validation delta: clean env for E2E; scripted AGY CLI for gated suites; 2 × ncpu load for AC-004; clean clone with `--frozen-lockfile`; broader validation `Not Required` beyond live-API and lifecycle cases

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-003, FU-004), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95% (no category below 95%)
- New or remaining failure IDs: none in scope; out of scope with causes: FU-002 (2 cases), FU-003, FU-004
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: AC-016 on the finalized `origin/personal` (delivery; pre-checked on the branch by API-21); RISK-001, RISK-002; macOS only; paid/live gated suites out of scope
