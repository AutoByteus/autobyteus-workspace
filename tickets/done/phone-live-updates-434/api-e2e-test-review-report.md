# API/E2E Test Review Report — autobyteus-434

## Review Meta

- Review Round: 3
- Trigger: delivery DR-001 (duplicate probe case ID MSP-20 after the base refresh), API/E2E pass API-REV-003 (commit `821c249062` on merge `b2bdcb98a4`); round 2 was API-REV-002 at `23fb0e5788`, round 1 API-REV-001 at `4bc2af1f54`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-001), AC-001…AC-006
- Investigation Notes Reviewed As Context: not needed beyond the requirements and design
- Solution Revision Record Reviewed As Context: not needed
- Design Spec Reviewed As Context: `design-spec.md` (SR-004): Per-Owner table, Agent Connect Rule (the agent attempt reads the stored state before it opens a socket)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-003, FU-004)
- Architecture Review Revision Record Reviewed As Context: not needed
- Implementation Revision Record Reviewed As Context: IR-001 (production source unchanged since `feb69495a5`)
- Original Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass, confidence 95.4 % (MSP-21 rerun `evidence/MSP-21-rerun-tr001/`)
- Prior unresolved test-review findings rechecked: TR-001 — Resolved (see Findings)
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
| Assertions prove approved requirements instead of incidental details | Pass | Round 2: MSP-21(c) now counts each phone's own run only (`ownAttempts`): the Team phone's `/ws/agent-team/<team run>`; the agent phone's `GetRunProjection` reads for the agent run plus `/ws/agent/<agent run>`, and it asserts the agent's attempt within 2 s of visible is the catch-up read (TR-001 resolved). Everything else asserts what the phone shows (markers on screen, copies, order before the tool call), the stored record, and stream counts where the stream is a WebSocket |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Reuses the probe's `runCase`/`serverAt`/`waitFor`/`assert`/`redact`; local helpers (`phoneOn`, `openRun`, `setVisibility`, `phoneDelay`, `mark`) remove repetition |
| Isolation and determinism appropriate for the boundary | Pass | Own node, proxy and browser; cleanup receipt in `evidence.liveReconnect.cleanup`. Waits are bounded and condition-based. Fixed sleeps are tied to the scenario's timing (45 s outage, 35 s hidden) |
| Large file coherent and navigable | Pass | One surface, three cases, sectioned |
| No stale, duplicated, disabled or compatibility-only tests | Pass | — |
| Coverage agrees with the coverage investigation and execution evidence | Pass | Round 2: the AC-004 proof row and the MSP-21 row match `MSP-21-rerun-tr001/mobile-shell-probe.json` (while hidden `[]`/`[]`; within 2 s of visible a Team socket at +7 ms, `GetRunProjection` at +8 ms; probe `Pass`) |
| Callers and fixtures exercise an independently established scenario | Pass | Outage, background and second-client scenarios are SCN-002/003/004. The node-side marker clients stand in for the agent producing events, as the desktop does |
| Each test enters through the real trigger and follows the real steps | Pass | Pairing through Phone Access, taps on run rows, the composer's Send, `visibilitychange`. The FU-004 second tap is allowed only after exactly that failure. The browser-line exemptions are narrow (outage window, favicon by source location, the exact FU-004 line). The WebSocket-only blackhole is a stated scoping (FU-003) |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `mobile-live-reconnect-cases.mjs` MSP-21(c) "hidden while unreachable" (`attemptsWhileHidden`, `attemptsWithin2sOfVisible` and their AC-004 assertions, lines 342-373) | The case counts WebSockets matching `/ws/agent(-team\|-org)?/` opened by the whole phone. The agent phone also keeps the Team's stream: the history read mounts the active Team in the background, as in FU-004. Its MSP-21 browser lines show `/ws/agent-team/live_team_…` handshakes failing while refused (`MSP-20-22-live-reconnect/mobile-shell-probe.json` and `API-08-mobile-shell-probe/mobile-shell-probe.json`, `browserErrors`, phone-agent). The agent run's own scheduled attempt starts with the stored-state read and opens no socket while the read fails (design, Agent Connect Rule; `agentRunStreamReconnection.ts` `attempt`). So `"phone-agent": 1` is the Team stream's attempt. The agent run's AC-004 behavior (no catch-up read while hidden, a read at once on visible) is never measured, and a regression there would still pass. The execution report's AC-004 row presents this as "1 attempt per phone". | Measure each phone's own run. Team phone: count only `/ws/agent-team/<teamRun>`. Agent phone: count the agent run's attempts as its catch-up reads, i.e. `/graphql` requests for that run's projection (`GetRunProjection`, `runId` = agent run) plus `/ws/agent/<agentRun>`. Assert none while hidden and at least one within 2 s of visible. Correct the AC-004 proof row and the MSP-21 case row in the execution report to match. Rerun MSP-21. | `Local Fix` — `api_e2e_engineer` — **Resolved in round 2** (`23fb0e5788`): `ownAttempts` counts only the shown run; while hidden an agent read fails the assertion too, so a regression on the agent path is now caught. Rerun MSP-21 Pass. Not rerun, accepted: MSP-20 (its edit only changes `NaN` to `null` on a value whose assertion fails anyway), MSP-22/API-08/API-09 (do not execute the changed code) |

Not findings, for the same edit if convenient:
- Line 296 `NaN` vs `null`: done in round 2.
- MSP-21(b) also counts only WebSockets while hidden. That is enough there: a black-holed stream gets no close event, so no owner has anything to attempt.

## Follow-ups

- Follow-ups this review added: None (FU-004 is API/E2E's and is correctly scoped).

## Round 3 Delta (DR-001, API-REV-003)

Reviewed: `git diff e60cb29272 821c249062 -- autobyteus-web/tests/e2e/`.

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Renumber is complete and changes no assertion | Pass | `mobile-live-reconnect-cases.mjs`: only IDs, `phone.case` labels, screenshot names and header change (MSP-20/21/22 → MSP-21/22/23); no `MSP-20` remains in the module; autobyteus-426 keeps MSP-20 |
| Duplicate-ID guard is correct and fails loudly | Pass | Start check in `mobile-shell-probe.mjs` reads the probe and each imported `./*-cases.mjs`, collects literal `runCase('<ID>'` IDs and exits 1 on a repeat before any stack starts. `runCase` also records `"<id> (duplicate)"` as `Fail` for a non-literal repeat, and the overall result fails on any non-`Pass` case (`mobile-shell-probe.mjs:2121-2133`). Negative check of the guard is recorded (pre-renumber copy exited 1 with the duplicate named) |
| Merged-state run proves the cases still hold | Pass | `evidence/MSP-20-23-merged/mobile-shell-probe.json`: probe `Pass`, cases MSP-20…23 all `Pass` as four distinct entries; MSP-22(c) while hidden `[]`/`[]`, within 2 s of visible Team socket +9 ms and `GetRunProjection` +12 ms (TR-001's assertions intact); built from the merged state (API-11) |
| Not rerun, accepted | Pass | API-06/07/09 and the other MSP cases do not execute this round's edits |
| Docs | Pass | Execution report and investigation use the new IDs with an old → new map; archived evidence keeps old names. Not adding a TESTING.md rule for one probe's ID scheme agrees with TESTING.md's "keep this file global" rule |

Findings this round: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-web/tests/e2e/mobile-live-reconnect-cases.mjs`, `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`
- Unresolved finding IDs: None (TR-001 resolved)
- Recommended Recipient: `delivery_engineer`
- Notes: Product behavior is not in question. The agent catch-up timing in MSP-21(c) (shown 3.07 s after the path passed) fits an immediate attempt on visible, and AC-004 for the agent owner is also unit-proven (API-04). Round 2: the durable probe now proves what its assertions name. Round 3: case IDs renumbered to MSP-21…23 (assertions unchanged; the MSP-21(c) reference above is MSP-22(c) now) and a duplicate-ID guard added; the merged-state run passes. Ready for delivery.
