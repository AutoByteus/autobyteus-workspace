# API/E2E Revision Record — `baseline-e2e-probe-repair`

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer direct-route handoff, round 1 | SR-001..SR-003, IR-001, IR-002 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline validation of the eight baseline test fixes on `3108bb9ef8`

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-002), round 1
- Triggering finding or case IDs: N/A (baseline)
- Related revision IDs: SR-001, SR-002, SR-003; IR-001, IR-002
- Why this baseline was recorded: first API/E2E result for the direct `Medium`/`Low` route
- Coverage decisions or durable test paths changed: none by API/E2E. The implementation's 8 test fixes were reviewed and judged valid, and the memory-sync MP_001/MP_002 removals were accepted under DEC-003.
- Cases added, changed, removed, or rechecked: VAL-000..VAL-013, including a temporary injected-failure check for UC-003 cascade isolation, since removed
- Commands, environment, fixture, or broader-validation delta:
  - Server rebuilt at HEAD.
  - The 7 e2e files ran twice in `env -i PATH HOME=<fresh tmp> TMPDIR`.
  - Two probes ran in a clean env; R03 ran with the real HOME/USER/LOGNAME.
  - typecheck and test:unit ran.
  - Broader validation: `Not Required`.

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md` (all new)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: None
- Recommended owner: Delivery Engineer (direct route)
- Remaining risks, blocked evidence, or untested scope:
  - Non-blocking observations OBS-1..OBS-3 (see the report).
  - The full `run-settings-live` probe is out of scope.
  - Follow-ups FU-1..FU-5 are already with `/project_task_manager`.
