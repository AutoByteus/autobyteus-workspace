# API/E2E Execution Coverage Report — Codex interrupted-compaction fix

## Execution Round Meta

- Ticket folder (all artifacts): /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/
- Requirements: requirements-doc.md (SR-002, Approved). Investigation notes: investigation-notes.md. Solution record: solution-revision-record.md. Design: design-spec.md. Supplements: probes/, solution-handoff.md.
- Implementation: implementation-handoff.md, implementation-revision-record.md (IR-001, commit 69b0493f2).
- Design review / architecture review / code review: `N/A — not applicable` (direct route).
- Coverage investigation: api-e2e-coverage-investigation.md. Ledger: api-e2e-test-case-ledger.md. Revision record: api-e2e-revision-record.md. Evidence: api-e2e-evidence/.
- API/E2E revision `API-REV-001`; round 1; trigger: implementation_engineer "Implementation Complete".

## Routing Classification

Medium / Low; direct low-risk route → delivery; test-code review `Not Required — direct low-risk route`.

## Investigation And Execution Basis

- Investigation written before coverage changes: `Yes`. Plan followed: `Yes`. One revision made during execution:
- The first terminate case (E2E-T) expected a `run_terminated` failed close. Live diagnosis showed that `AgentRun` termination (AgentRunManager.terminateAgentRun and server shutdown via terminatePrivate → AgentRun.terminate) quiesces input and waits for the active turn (`prepareTerminationOnce` → `waitForQuiescence`) before `backend.terminateRun`. A compaction running at Terminate therefore ends with its turn (observed: completed, 3/3); it is never left open. The case now asserts this real-use invariant. The backend's `run_terminated` close is a defensive path, covered by unit tests only. Not a product defect (see OBS-1).
- Reroute: `No`.

## Test-Case Ledger Reconciliation

Ledger initialized before execution; every case recorded; reconciled. No unstarted or interrupted cases.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| REPO-01 Codex/history/accumulator units | Pass (350; 4 pre-existing tool-log-correlation failures also on base) | console, sweep-base.json |
| REPO-02 src typecheck (+ tests filtered) | Pass | console |
| REPO-03 sweep HEAD vs base 03d5db06b | Pass (same 66 pre-existing; 2 first-run TEST_SERVER_BUILD_REQUIRED pass on rerun) | sweep-head.json, sweep-base.json, rerun-stopped-run-model-config-head.log |
| WEB-1 web specs + Codex abandoned case | Pass 30/30 | console |
| E2E-I interrupt during auto compaction (+ history) | Pass ×4 (runs 1–4) | live-codex-run1..4.log |
| E2E-K app-server SIGKILL during compaction | Pass ×4 | live-codex-run1..4.log |
| E2E-T terminate during compaction (real-use invariant) | Pass ×3 (runs 2–4; ended as completed each time) | live-codex-run2..4.log, live-codex-terminate-diag.log |
| UI-1 packaged desktop journey | Pass | ui-01/02/03 screenshots, ui-run-memory/raw_traces_manifest.json |

## Compatibility / Legacy Scope Check

No compatibility mechanism or legacy retention; no migration; the 32 historical markers are untouched; no compatibility-only coverage.

## Changed Boundary And Evidence Matrix

| Case | Requirement / AC | Boundary | Mode | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| REPO-01 | AC-C01a, AC-C01b, AC-C01c (history unit) | projector registry, turn/error/terminate hooks, recorder, history replay | unit with real probe notifications | Pass | interrupted auto: started+failed X, Y one archive; interrupted manual: no archive; 6 normal pairs: 6 archives |
| E2E-I | SCN-C1, AC-C01d, RU-1 | real codex app-server 0.160.0 (lowered auto-compact limit) → AgentRunManager → recorder → history service | live | Pass ×4 | failed X ("…(turn interrupted).") before TURN_COMPLETED; no archive for X; next compaction Y completes with exactly one archive; reopened history has one completed row, none started |
| E2E-K | SCN-C4 | app-server process killed while compacting | live | Pass ×4 | failed X ("…(Codex app server closed).") before ERROR; markers compacting+failed on disk; 0 archives; history one failed row |
| E2E-T | SCN-C5 / BEH-C2 (real-use form) | Terminate while compacting | live | Pass ×3 | the compaction ends with exactly one terminal event (completed in all runs); markers on disk; archives match; history has no started row; no error |
| WEB-1 | AC-C01c | web projection | spec | Pass | Codex started → abandoned on the same row with the reason |
| UI-1 | BEH-C1, AC-C01c, RU-1/RU-2 | packaged desktop app (isolated iso-60242-b10e), Codex runtime GPT-5.6-Luna; the instance's own server-data/.env set `CODEX_APP_SERVER_ARGS_JSON=["app-server","-c","model_auto_compact_token_limit=20000"]` (existing operator launch option) | desktop | Pass | see journey table |

### Desktop journey (UI-1)

| Step | Expected | Observed |
| --- | --- | --- |
| Turn ONE (≈40K-token dump) | reply | "OK ONE" |
| Turn TWO; press Stop when the COMPACTING row appears | the same row ends FAILED with the reason; run idle | COMPACTING at 0.10 s → Stop → same row FAILED "Compaction interrupted before it completed (turn interrupted)." at 0.31 s; Idle |
| "Reply with exactly: OK AFTER" | a new compaction completes normally | new row COMPACTING → COMPLETED in 5.0 s; Activity: #3381d4 FAILED, #ff44ec COMPLETED |
| Turn THREE, then turn FOUR with Stop | FOUR's compaction ends FAILED | THREE compacted normally; FOUR: COMPACTING at 0.10 s → FAILED at 0.31 s |
| App restart, reopen run | starts at the latest completed boundary; the interrupted compaction shows one FAILED row, no "started" | rows: COMPLETED (THREE), FAILED (FOUR); Activity 2 items; replies OK THREE |
| Send "OK FINAL" (restores Codex) | run continues | "OK FINAL"; its compaction completed normally |
| Disk | archives only for completed compactions; each interrupted one has started+failed | 3 segments (8, 4, 8 records) for the 3 completed compactions; interrupted 564a0c and feeb9b each have compacting + failed (reason) and no own archive; active starts with the latest completed marker |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Evidence | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 92 % | 96 % | AC-C01a–d proven directly (replay, unit, history and web live, live ×4) | — |
| Changed-boundary directness | 90 % | 96 % | real app server through AgentRunManager and the packaged app | — |
| Integration realism | 88 % | 95 % | packaged app websocket, GraphQL history, restart, restore | — |
| Environment/config fidelity | 92 % | 95 % | lowered limit via the existing `CODEX_APP_SERVER_ARGS_JSON` / test flag; event shapes match production data (C06) | default-limit compaction duration not exercised |
| Failure/edge/lifecycle | 88 % | 95 % | interrupt (×6 incl. UI), crash ×4, terminate characterized ×3, restore after interrupt | completed/failed-status turns with an open item and terminal turn errors never observed (unit only, defensive) |
| User surface | 85 % | 94 % | live and reopened rows in the packaged app | reopened FAILED row lacks the reason (OBS-2) |
| Durable regression coverage | 95 % | 95 % | live file 3 cases, web case | live suite opt-in (quota) |

- Overall post-repository confidence: 90.0 %. Final: **95.1 %** (666/7); lowest category 94 %. All critical ACs directly proven; no category below 90 %; 95 % target met.

## Broader Validation Decision And Execution

`Required`, executed: live Codex (4 runs of the extended file) and a packaged desktop journey. The app was started with `pnpm --silent isolated-app start --build`. Setup used the instance's own `.env` plus `isolated-app restart`, and the agent was created through GraphQL. The UI was driven through browser-automation (attach-only; dumps set into the composer and sent with Send/Stop). The instance was then stopped and its data root removed. Codex used the operator's login and quota. No AutoByteus user data was used, and other instances were left alone.

## Platform / Runtime Targets

macOS arm64; codex-cli 0.160.0; gpt-5.6-luna; Electron 42.4.1 packaged build.

## Lifecycle / Persisted-Data Checks

No migration; new failed markers are read by the unchanged history reader (service and app reopen). Restore after an interrupted compaction continues cleanly, and the next compaction completes and rotates.

## Durable Coverage Changed In The Codebase (uncommitted in the worktree)

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts | Updated | shared setup; interrupt case + reopened-history check (RU-1); new terminate case (real-use invariant; SCN-C5); new app-server crash case (SCN-C4) | 3/3 in 3 consecutive runs |
| autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts | Updated | Codex started → abandoned on the same row (AC-C01c) | Pass |

Removed paths: none.

## Temporary Scaffolding

Base worktree /tmp/codex-base (removed); UI script api-e2e-evidence/ui-send-script.js (kept as evidence); terminate diagnostic run (its message improvement was replaced by the rewritten case).

## Observations (non-blocking)

- OBS-1, for solution_designer. SCN-C5/BEH-C2 assume Terminate can cut off an open compaction. In the product, AgentRun termination waits for the active turn before the backend terminates, so the compaction finishes with its turn (completed in 3/3 live runs) and nothing stays open. The backend `run_terminated` close is a harmless defensive path (unit-proven) that normal terminate does not reach. The approved goal, that every started compaction is closed, holds. Docs could say that Terminate waits for the turn.
- OBS-2: reopened history shows an abandoned compaction as "Provider context compaction failed" without the reason. The marker persists `error_message`, but the history replay does not project it. This is a pre-existing reader limitation (same as Claude); live rows show the reason.
- OBS-3, docs for delivery: the TESTING.md Codex row says "the interrupted-compaction case alone"; the file now has 3 cases (interrupt, terminate, app-server crash).
- OBS-4: the first broad sweep in a fresh worktree fails 2 `stopped-run-model-config-graphql` tests (`TEST_SERVER_BUILD_REQUIRED`); this is pre-existing environment behavior.

## Result Summary

| Result | Cases |
| --- | --- |
| Pass | REPO-01..03, WEB-1, E2E-I, E2E-K, E2E-T, UI-1 |
| Not Tested (not observable / no trigger) | SCN-C2 live (AutoByteus never starts a manual Codex compaction; replay only); SCN-C3 live (never observed; unit only); model-side compaction failure |

## Cleanup Performed

Isolated instance iso-60242-b10e stopped (data root removed, ports released); base worktree removed; temporary scripts removed; live-test temp dirs removed by the tests. autobyteus-web/electron-dist holds this worktree's packaged build (gitignored).

## Latest Authoritative Result

- Result: **Pass**. Final confidence 95.1 % (lowest 94 %); target met; no category below 90 %.
- Broader validation: `Required`, executed (live ×4, packaged desktop journey).
- Critical ACs lacking direct proof: none.
- Next: per `get_handoff_rules` (direct route → delivery).
