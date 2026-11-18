# API/E2E Revision Record — autobyteus-308

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-001 (direct route), round 1 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: served surfaces with real runs and tool calls, the peer, the page, a clean clone

- Triggering role, report path, and round: Implementation engineer, `implementation-handoff.md` (IR-001), API/E2E round 1.
- Triggering finding or case IDs: none (baseline).
- Related revision IDs: SR-001, IR-001.
- Why recorded: first validation.
- Coverage decisions or durable test paths changed: added `tests/e2e/agent-definitions/internal-agents.e2e.test.ts`, `autobyteus-web/tests/e2e/internal-agents-probe.mjs` (+ script); updated `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (beta's internal agent, RC-38).
- Cases: API-00 reused; API-01…06, API-08…10 Pass; API-07 Not Tested (tool unregistered, FU-001).
- Commands, environment, fixture, or broader-validation delta: scripted AGY CLI for real tool calls; two built nodes; real-stack probe; one live local model; a fresh clone.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: investigation, execution report, progress log, `follow-ups.md` (FU-001), evidence `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95%.
- New or remaining failure IDs: none.
- Recommended owner: delivery engineer (direct route).
- Remaining risks, blocked evidence, or untested scope: AC-004 is proven at code level only (FU-001); the application resolver observation remains for autobyteus-32; observations O-1, O-2.
