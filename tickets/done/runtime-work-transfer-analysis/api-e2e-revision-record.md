# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative. This record indexes API/E2E rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | implementation_engineer / implementation-handoff.md / round 1 | SR-013, IR-001 | N/A | Pass / 95.0 % |

## Revision Entries

### API-REV-001 — Baseline validation of Claude compaction detection and raw-trace rotation

- Triggering role, report path, and round: implementation_engineer, /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis/tickets/in-progress/runtime-work-transfer-analysis/implementation-handoff.md, round 1.
- Triggering finding or case IDs: N/A (initial validation).
- Related revision IDs: SR-013 (solution), IR-001 (implementation, commit 307d0e775); architecture/code review N/A (direct route).
- Why recorded: first completed API/E2E validation result.
- Coverage decisions or durable test paths changed:
  - Updated autobyteus-server-ts/tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts. Runs on every CLI candidate. Adds a reopened-history check through `AgentRunViewProjectionService`, plus new cases: Stop during `/compact`, CLI process exit during `/compact`, and opt-in auto compaction (`RUN_CLAUDE_AUTO_COMPACTION_E2E=1`).
  - Updated autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts: new Claude started → failed case.
  - Both changes are uncommitted in the worktree.
- Cases added, changed, removed, or rechecked: REPO-01..04, E2E-01..05, UI-01..03, TMP-01 (temporary, removed).
- Commands, environment, fixture, or broader-validation delta:
  - Live Claude E2E on path CLI 2.1.283 and SDK-bundled 2.1.280 (haiku).
  - Temporary opus long-compaction probe.
  - Base-worktree regression delta.
  - Isolated packaged desktop instance (iso-55016-1001) driving a Claude Agent SDK run through `/compact`, Stop and restart/reopen. The instance was stopped and its data root removed.
- Mid-round test defect (not a product defect): the first E2E-03 run asserted history through the bare projection provider, which lists one row per marker. It was corrected to the production service, which applies the projection dedupe. A deterministic probe confirmed the service returns 1 failed activity.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: api-e2e-coverage-investigation.md (all), api-e2e-execution-coverage-report.md (all), api-e2e-test-case-ledger.md (events 1–13).
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.0 % (lowest category 93 %, user surface).
- New or remaining failure IDs: none.
- Recommended owner: N/A (Pass → delivery per handoff rules).
- Remaining risks, blocked evidence, or untested scope:
  - Live 30 s keepalive not reproduced. Covered by synthetic real-shape replay; CLI source shows the timer is cleared before the boundary.
  - Non-blocking observations OBS-1..4, outside the approved ACs:
    - OBS-1: reopened history omits the failure reason.
    - OBS-2: the browse-earlier Event Monitor page lists a failed op as 2 event visuals.
    - OBS-3: the run title derives from the active segment after rotation.
    - OBS-4: keepalive lifecycle.
