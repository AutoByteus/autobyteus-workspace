# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 (direct route) | SR-001, IR-001 | N/A | Pass / 95.1% |

## Revision Entries

### API-REV-001 — Live validation of the Claude 2-hour limits, end reasons and per-runtime long-command checks

- Triggering role, report path, and round: implementation engineer, `tickets/in-progress/shell-command-time-limits-483/implementation-handoff.md` (IR-001), round 1.
- Triggering finding or case IDs: N/A (baseline).
- Related revision IDs: SR-001 (requirements and design), IR-001 (implementation); no architecture or code review (direct route).
- Why this baseline was recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/long-command-time-limits-live.e2e.test.ts`; updated `claude-agent-background-task.e2e.test.ts`, `autobyteus-background-task-transport.e2e.test.ts` (BGT-06/08), `agy-background-task-updates-live.e2e.test.ts`, `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` (MSP-47, new MSP-59) and the phone probe header (commit `48d2a4da58`). Baseline fixes in their own commit `ea86a9affe`: `claude-live-agent-harness.ts` (stream sequence, stale since autobyteus-461) and BGT-09 (observes the copy's own stream).
- Cases added, changed, removed, or rechecked: API-01 (LCL-LONG-* ×9, LCL-ENV-* ×3), API-02, API-03, API-04, API-05, API-FSB, API-06; reused IMP-01/02/04/08/09/10 as API-R1..R4.
- Commands, environment, fixture, or broader-validation delta: live runs on the host's signed-in CLIs through an in-process studio server; phone production bundle; fresh-clone release build.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, `follow-ups.md` (FU-003).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.1%
- New or remaining failure IDs: None
- Recommended owner: delivery engineer
- Remaining risks, blocked evidence, or untested scope: CLI upgrades (RSK-002; the new suite re-checks); the user's own `~/.claude/settings.json` path not exercised; low-memory stop not produced live; Grok observation (no self-started turn on a background job's end) noted for the Solution Designer.
