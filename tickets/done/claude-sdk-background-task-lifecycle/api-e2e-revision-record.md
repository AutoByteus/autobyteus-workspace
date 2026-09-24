# API/E2E Revision Record — claude-sdk-background-task-lifecycle

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer, Implementation Complete, round 1 | SR-004, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: live proof of foreground-only Bash and 30-min ceiling on both Claude CLIs

- Triggering role, report path, and round: `implementation_engineer`, `implementation-handoff.md` (IR-001, commit `b041e34df`), round 1
- Triggering finding or scenario IDs: N/A (initial validation)
- Related revision IDs: SR-004, IR-001. Architecture/code review: N/A (direct route)
- Why recorded: first completed API/E2E result
- Coverage decisions / durable test paths changed:
  - Added `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client-runtime-policy.integration.test.ts`
  - Added `autobyteus-server-ts/tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts`
  - Added `autobyteus-server-ts/tests/helpers/claude-cli-executable-candidates.ts`
  - No existing coverage updated or removed.
- Scenarios: UNIT-ENV, E2E-POL-01, E2E-BG-01, REG-LIVE, CTRL-BASE, PROBE-AC003, PROBE-SETTINGS, AC-004 review
- Commands / environment: `RUN_CLAUDE_E2E=1` gated vitest runs with parent Claude session env removed; PATH CLI 2.1.281 and SDK-bundled CLI 2.1.280; model `haiku`; base control by temporarily reverting `claude-sdk-client.ts` to `9267d11c8`

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: none in scope. Pre-existing base failures (1 unit, 3 mocked websocket E2E) are out of scope.
- Recommended recipient: Delivery (direct low-risk route)
- Remaining risks:
  - RSK-A: a settings `env` override (confirmed mechanism, documented, not present);
  - RSK-B: other CLI-process-scoped tools (Monitor/ScheduleWakeup/Cron/Workflow) still advertised (out of scope);
  - RSK-C: the 2-min default timeout requires the model to request longer.
