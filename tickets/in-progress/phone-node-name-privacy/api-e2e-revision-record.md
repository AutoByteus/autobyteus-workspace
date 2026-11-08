# API/E2E Revision Record — phone-node-name-privacy (autobyteus-433)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | SR-002, IR-001 | N/A | Fail / 66% |

## Revision Entries

### API-REV-001 — Baseline: everything passes except the in-page load-failure screen, which shows the node URL from WebView's error page

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001, code `ba3ba5b23e`), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-002, IR-001
- Why this baseline was recorded: first validation of the direct-route package
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` baseline fix (`f7bb05f5ec`): a request cut off by closing a phone's context is no longer answered as refused (cause of two unexpected MSP-12 errors, proven with temporary logging)
- Cases added, changed, removed, or rechecked: API-01, API-01b (reused IMP-02/04/05/06/07/08), API-02 (full probe + MSP-12/MSP-09 rerun), API-03 (instrumented), API-04…API-10 (emulator journeys), API-08b (user-only reproduction of the failure)
- Commands, environment, fixture, or broader-validation delta: ticket-owned AVD `pnnp433_api35` (headless), two worktree nodes, test DNS names, WebView DevTools; all removed after the run

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-002), `evidence/`
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 66%
- New or remaining failure IDs: API-08, API-08b (AC-007, AC-009, QR-001)
- Recommended owner: Solution Designer (preliminary `Design Impact`), through the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: the user-only part of AC-001 (an HTTPS `*.ts.net` session on his own phone); FU-002 out of scope
