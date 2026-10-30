# API/E2E Revision Record — busy-quit-shutdown-orphan (autobyteus-284)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 Pass, round 1 | SR-008, ARCH-REV-003, IR-001, CRR-001 | N/A | `Fail` / 91.7% (F-API-001 `Local Fix`; F-API-002 `Unclear`) |

## Revision Entries

### API-REV-001 — Baseline: live, desktop and durable validation of design step 6

- Triggering role, report path, and round: code reviewer; `code-review-report.md` (CRR-001); round 1.
- Triggering finding or case IDs: N/A (first validation).
- Related revision IDs: SR-008; ARCH-REV-003; IR-001; CRR-001.
- Why this baseline was recorded: first complete API/E2E result for code `bf2857ca29`.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/shutdown/busy-run-stop-now.e2e.test.ts`, `busy-run-stop-now-fixture.mjs`, `busy-application-terminate-fixture.mjs` (commit `55ddc71839`; gate `RUN_BUSY_STOP_NOW_E2E=1`; fail on the base build).
- Cases added, changed, removed, or rechecked: API-R1 (reused IMP-01..09), API-00..API-15 as in the report; added during the run: API-06R, API-09, API-11R1, API-11B, API-11C, API-11D; API-14 not tested (unsafe install).
- Commands, environment, fixture, or broader-validation delta: clean detached checkout of `b520b51c9e` and a base checkout of `1a4453e553`, both removed afterwards. Live Codex `gpt-6.1-terra` (effort medium, throwaway `CODEX_HOME`) and Claude haiku. Isolated packaged desktop instances. A temporary diagnostic app copy (removed).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-progress.md`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 91.7% (failure/edge/lifecycle 84%).
- New or remaining failure IDs: F-API-001 (sweep selects its own `ps` reader); F-API-002 (intermittent 10 s stall of the graceful cleanup with busy roots, 1 of 15; contained).
- Recommended owner: failure-origin review by the code reviewer; F-API-001 preliminarily implementation (`Local Fix`).
- Remaining risks, blocked evidence, or untested scope: update install (API-14) not run; Windows out of the platform guardrail; N-5/FU-007 observed on the forced and stalled paths.
