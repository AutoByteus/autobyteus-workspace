# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/implementation_engineer` Implementation Complete / round 1 | SR-001, IR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Initial baseline: AGY background-task turn liveness validated with real AGY

- Triggering role, report path, and round: `/implementation_engineer`, `implementation-handoff.md`, round 1
- Triggering finding or scenario IDs: N/A (initial)
- Related revision IDs: SR-001 (solution), IR-001 (implementation); architecture review and code review `N/A — not applicable`
- Why this baseline was recorded: first completed API/E2E validation of the direct Small/Low package
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-transport.e2e.test.ts` (fake AGY through the real server).
  - Added `autobyteus-server-ts/tests/e2e/runtime/agy-background-task-live.e2e.test.ts` (opt-in real AGY).
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (daemon cases).
  - Extended `autobyteus-web/.../toolLifecycleHandler.spec.ts` and `autobyteus-web/.../runProjectionConversation.spec.ts`.
- Scenarios added: E2E-BG-001, E2E-BG-002, LIVE-BG-001, LIVE-BG-002, LIVE-BG-003, WEB-001. Rechecked: UNIT-001, E2E-REG-001, TSC-001.
- Commands, environment, fixture, or broader-validation delta:
  - broader validation `Required` and executed with real `agy` 1.2.12 (`gemini-3.8-flash-high`);
  - web env needed `pnpm exec nuxi prepare`;
  - LIVE-BG-001 was rerun after its ASM-001-derived assertion was converted to evidence.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (events 1–14), `evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 96%
- New or remaining failure IDs: none. Non-blocking finding F-API-001: ASM-001 is falsified, because AGY-backgrounded daemons outlive AGY SIGTERM.
- Recommended recipient: `/delivery_engineer`
- Remaining risks, blocked evidence, or untested scope:
  - F-API-001 (separate-ticket candidate);
  - non-SUCCESS `result` closure is unit-only;
  - a single live model was used.
