# API/E2E Test Review Report — autobyteus-434

## Review Meta

- Review Round: 1
- Trigger: API/E2E pass, API-REV-001 (commit `4bc2af1f54`)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001), AC-001…AC-006
- Investigation Notes Reviewed As Context: not needed beyond the requirements and design
- Solution Revision Record Reviewed As Context: not needed
- Design Spec Reviewed As Context: `design-spec.md` (SR-004): Per-Owner table, Agent Connect Rule (the agent attempt reads the stored state before it opens a socket)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-003, FU-004)
- Architecture Review Revision Record Reviewed As Context: not needed
- Implementation Revision Record Reviewed As Context: IR-001 (production source unchanged since `feb69495a5`)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, confidence 95.4 %
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline(s) applied: `TESTING.md` § Browser probes and § Rules ("Assertions first", "Probes fail on browser errors", probe-owned stack and cleanup). No conflict or discrepancy.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-002, SCN-003, SCN-004; the visibility emulation reproduces the WebView signal that API-09 confirmed on the emulator)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs` | Added | SCN-002/003/004; AC-001…AC-005 | The phone's run streams after a lost path, after the background, and a message loaded during its turn (MSP-20…22), on its own node, proxy and phones | 471 lines; one coherent surface |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Header entry, runtime note, one call of the module after the existing cases | No existing case changed |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Header states each case's AC, stack and modes; assertion messages name the AC |
| Assertions prove approved requirements instead of incidental details | Fail | MSP-21(c): see TR-001. Everything else asserts what the phone shows (markers on screen, copies, order before the tool call), the stored record, and stream counts where the stream is a WebSocket |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Reuses the probe's `runCase`/`serverAt`/`waitFor`/`assert`/`redact`; local helpers (`phoneOn`, `openRun`, `setVisibility`, `phoneDelay`, `mark`) remove repetition |
| Isolation and determinism appropriate for the boundary | Pass | Own node, proxy and browser; cleanup receipt in `evidence.liveReconnect.cleanup`. Waits are bounded and condition-based. Fixed sleeps are tied to the scenario's timing (45 s outage, 35 s hidden) |
| Large file coherent and navigable | Pass | One surface, three cases, sectioned |
| No stale, duplicated, disabled or compatibility-only tests | Pass | — |
| Coverage agrees with the coverage investigation and execution evidence | Fail | The execution report's AC-004 proof row ("1 attempt per phone within 2 s of visible") counts a Team stream on the agent phone (TR-001) |
| Callers and fixtures exercise an independently established scenario | Pass | Outage, background and second-client scenarios are SCN-002/003/004. The node-side marker clients stand in for the agent producing events, as the desktop does |
| Each test enters through the real trigger and follows the real steps | Pass | Pairing through Phone Access, taps on run rows, the composer's Send, `visibilitychange`. The FU-004 second tap is allowed only after exactly that failure. The browser-line exemptions are narrow (outage window, favicon by source location, the exact FU-004 line). The WebSocket-only blackhole is a stated scoping (FU-003) |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `mobile-live-reconnect-cases.mjs` MSP-21(c) "hidden while unreachable" (`attemptsWhileHidden`, `attemptsWithin2sOfVisible` and their AC-004 assertions, lines 342-373) | The case counts WebSockets matching `/ws/agent(-team\|-org)?/` opened by the whole phone. The agent phone also keeps the Team's stream: the history read mounts the active Team in the background, as in FU-004. Its MSP-21 browser lines show `/ws/agent-team/live_team_…` handshakes failing while refused (`MSP-20-22-live-reconnect/mobile-shell-probe.json` and `API-08-mobile-shell-probe/mobile-shell-probe.json`, `browserErrors`, phone-agent). The agent run's own scheduled attempt starts with the stored-state read and opens no socket while the read fails (design, Agent Connect Rule; `agentRunStreamReconnection.ts` `attempt`). So `"phone-agent": 1` is the Team stream's attempt. The agent run's AC-004 behavior (no catch-up read while hidden, a read at once on visible) is never measured, and a regression there would still pass. The execution report's AC-004 row presents this as "1 attempt per phone". | Measure each phone's own run. Team phone: count only `/ws/agent-team/<teamRun>`. Agent phone: count the agent run's attempts as its catch-up reads, i.e. `/graphql` requests for that run's projection (`GetRunProjection`, `runId` = agent run) plus `/ws/agent/<agentRun>`. Assert none while hidden and at least one within 2 s of visible. Correct the AC-004 proof row and the MSP-21 case row in the execution report to match. Rerun MSP-21. | `Local Fix` — `api_e2e_engineer` |

Not findings, for the same edit if convenient:
- Line 296: `find(…)?.openedAt - passedRel ?? null` gives `NaN`, not `null`, when no reopened stream is found. The assertion still fails correctly (`Number.isFinite`).
- MSP-21(b) also counts only WebSockets while hidden. That is enough there: a black-holed stream gets no close event, so no owner has anything to attempt.

## Follow-ups

- Follow-ups this review added: None (FU-004 is API/E2E's and is correctly scoped).

## Latest Authoritative Result

- Result: `Fail`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs`, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`
- Unresolved finding IDs: TR-001
- Recommended Recipient: `api_e2e_engineer`
- Notes: Product behavior is not in question. The agent catch-up timing in MSP-21(c) (shown 3.07 s after the path passed) fits an immediate attempt on visible, and AC-004 for the agent owner is also unit-proven (API-04). TR-001 asks the durable probe to prove what its assertion names. After the fix: rerun MSP-21, then send this review again (a proportional test review, not a source review).
