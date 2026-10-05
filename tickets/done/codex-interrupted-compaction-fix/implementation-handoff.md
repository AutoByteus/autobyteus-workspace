# Implementation Handoff — Codex interrupted-compaction fix

Ticket root: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix
Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix; branch `codex/codex-interrupted-compaction-fix`; base origin/personal @ 03d5db06b; implementation commit `69b0493f2`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (Medium / Low). Solution Designer sent "Architecture Design Complete" under the Small/Medium + Low rule → /implementation_engineer.
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/requirements-doc.md (Approved 2026-10-04; REQ-C01, REQ-C04)
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/investigation-notes.md (C01–C16)
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/solution-revision-record.md (SR-002)
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/design-spec.md
- Supplemental task artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/probes/ ; solution handoff /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/solution-handoff.md
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A — initial implementation

## Current Implementation Summary

`CodexProviderCompactionStatusProjector` now owns a private registry of open compactions, keyed by stable item id and remembering the turn id and thread id.
- An item is registered when a non-rotating started projection with a stable id is emitted.
- It is forgotten on any rotation-eligible projection with the same id, even one that is deduplicated: item/completed, the raw compaction item, or thread/compacted.

`closeOpenForTurn(turnId, reason)` and `closeAllOpen(reason)` remove the matching entries. For each one they return a failed payload exactly as in the design's event spine:
- `source_surface` codex.context_compaction_abandoned
- `boundary_key` codex:&lt;thread&gt;:&lt;item&gt;:failed
- `provider_event_id` = the item id, plus the `turn_id` and `provider_thread_id` of the open item
- `status` failed, `rotation_eligible` false, `semantic_compaction` false, `provider_timestamp` null
- `error_message` from a fixed reason table: interrupted, turn_failed, turn_ended, runtime_error, app_server_closed, run_terminated

Hooks:
- **Turn end:** `convertCodexTurnEvent` TURN_COMPLETED derives the reason from `turn.status` (interrupted → interrupted, failed → turn_failed, otherwise turn_ended) and emits the closes before TURN_COMPLETED. If the turn id is unknown, it closes all open items.
- **Terminal error:** the lifecycle converter's ERROR case handles a terminal error. A turn-scope error closes that turn (turn_failed). Any other terminal error closes all, with app_server_closed when the code (top-level or nested `error.code`) is `CODEX_APP_SERVER_CLOSED`, else runtime_error. Closes come before the ERROR event. Diagnostic (retrying) errors close nothing.
- **Terminate:** `CodexAgentRunBackend.terminateRun` calls the new `CodexThreadEventConverter.closeOpenCompactions("run_terminated")` and dispatches the result to the current source listeners before `threadManager.terminateThread` and unsubscribe. A listener failure is logged and does not block terminate.

The failed close is always created with `statusHint: null`. Created under the `turn/completed` or `error` event name it would otherwise inherit an IDLE/ERROR hint.

- Implementation cycle: `Initial`
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/implementation-revision-record.md
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review / code-review / API-E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium` · Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - All changes are inside backends/codex: projector, three converters and the backend.
  - The escalation trigger did not fire: terminate needed only "emit before terminateThread/unsubscribe", and thread-manager listener ownership is unchanged.
  - The COMPACTION_STATUS contract, recorder and web/history were reused unchanged.
  - No schema or migration change.
- Selected route: `Direct API/E2E` (per get_handoff_rules)
- Lightweight implementation self-review completed: `Yes`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-C1 / SCN-C1 | Interrupted auto compaction ends failed (same activity), no rotation; next one pairs normally | turn/completed (interrupted) → `convertCodexTurnEvent` → `closeOpenCompactionsForTurn` → projector `closeOpenForTurn` → failed COMPACTION_STATUS → TURN_COMPLETED | Real replay (probe C10 notifications) produces compacting X, failed X, compacting Y, compacted Y. The failed close sits immediately before turn 2's TURN_COMPLETED. In memory: started+failed markers for X and 1 archive segment, keyed to Y. Live E2E: the same result through the real app server. |
| SCN-C2 | Interrupted manual compaction | same | Real replay (probe C11) produces compacting then failed, with no archive. |
| SCN-C3 | Turn completes `completed`/`failed` with an open item | same; reason turn_ended / turn_failed | Unit tests cover all three statuses and their messages. |
| SCN-C4 | Terminal turn/runtime error or app-server close | lifecycle ERROR case → close turn or all, before ERROR | Unit tests cover: turn-terminal error (close before ERROR, null hint); retrying error closes nothing; runtime CODEX_APP_SERVER_CLOSED → app_server_closed; other runtime code → runtime_error. |
| BEH-C2 / SCN-C5 | Terminate during compaction closes it before listeners detach | `CodexAgentRunBackend.terminateRun` → `closeOpenCompactions("run_terminated")` → listeners → `terminateThread` | Unit tests: the failed close reaches the listener before terminateThread is called; nothing is published when no compaction is open; a throwing listener still lets terminate succeed. |
| SCN-C6 / REQ-C04 | Normal compactions unchanged | registry forgets on completion; dedupe unchanged | Real replay of 6 auto compactions: 6 pairs, 6 archives, no failed close. The existing Codex converter compaction tests and suites pass (see checks). |
| AC-C01c | Web/history show one activity ending failed | unchanged web/history projections | New history replay test: started + abandoned markers form one activity `compaction:provider:codex:thread-1:item-1:turn-1` in phase failed. The existing web agentStatusHandler spec passes (25/25; it covers failed phase and provider-id pairing). |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source (autobyteus-server-ts/src/agent-execution/backends/codex/):
- `events/codex-provider-compaction-status-projector.ts` — `CodexObservedCompactionSourceSurface` (inputs) vs `CodexCompactionSourceSurface` (adds abandoned), `CodexCompactionAbandonReason`, registry, `closeOpenForTurn`, `closeAllOpen`.
- `events/codex-turn-event-converter.ts` — `closeOpenCompactionsForTurn` context hook and turn-status reason.
- `events/codex-thread-lifecycle-event-converter.ts` — terminal-error close hook.
- `events/codex-thread-event-converter.ts` — hook wiring, public `closeOpenCompactions(reason)`, `toAbandonedCompactionEvents` (null status hint).
- `backend/codex-agent-run-backend.ts` — terminate publishes the closes first.

Tests and fixtures (autobyteus-server-ts/tests/):
- `fixtures/codex-compaction/` — NEW: real app-server notifications from the probes (long strings truncated) plus a README.
- `unit/agent-execution/backends/codex/events/codex-compaction-abandon.test.ts` — NEW, 12 tests: replays into memory, turn statuses, terminal and diagnostic errors, runtime errors.
- `unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` — 2 new terminate tests.
- `unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts` — abandoned compaction forms one failed activity.
- `e2e/runtime/codex-interrupted-compaction.e2e.test.ts` — NEW, `RUN_CODEX_E2E=1` live interrupt E2E.

Docs: `autobyteus-server-ts/docs/modules/codex_integration.md`, `autobyteus-server-ts/docs/modules/agent_memory.md`, `TESTING.md`.

## Important Assumptions

- **Close methods return payloads.** The design types them as returning `CodexProviderCompactionProjection[]`; they return payloads instead, and the converter wraps them with a null status hint. A projection's `codexEventName` would only feed the default hint, and that hint is wrong for a close.
- **Unknown turn id.** A turn/completed without a resolvable turn id closes all open items, mirroring how reasoning blocks are closed at such a boundary. Codex runs one turn at a time per thread.
- **Items without a stable id are not tracked.** This was not observed in practice; it is documented in the design.
- **How the live E2E lowers the limit.** The live E2E starts its test app server with `-c model_auto_compact_token_limit=20000`, which is exactly what probe C09/C10 used. The design said "via thread config", but that path is unproven and would need a product change; the CLI flag is test-only and proven.

## Known Risks

- If the AutoByteus process is killed hard (no terminate), an open marker remains. This residual is out of scope.
- Model-side compaction failure is not reproducible. It would end the turn the same way and be closed by the same hook.
- The live E2E is timing-based. The interrupt must land before the 2–4 s compaction completes; the test fails with an explicit "rerun" message if the compaction completed first. It uses Codex quota (3 turns).

## Task Design Health Assessment Implementation Check

- Reviewed root cause: no owner for "open" compaction state. The projector now owns it.
- Reviewed refactor decision: `No Refactor Needed` (registry inside the existing owner).
- Implementation matched the reviewed assessment: `Yes`. Routed as `Design Impact`: `N/A`.
- Evidence / notes: the registry is private to the projector. The turn and lifecycle converters call it only through the converter context, and the backend calls one converter method. The projector does no I/O.

### Self-review (direct route)
- The close never rotates (`rotation_eligible` false) and uses a distinct `:failed` boundary key, so recorder dedupe is unaffected.
- The close is emitted before the ending event on every path (tested), and the registry is cleared per close.
- Completed-compaction dedupe and window keys are untouched. The registry is forgotten even when a completion is deduped, so a deduplicated completion never leaves a stale open entry.
- No Claude or AGY file changed. The recorder and web are unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` · Legacy retained: `No` · Obsolete code: none in scope · Shared structures tight: `Yes` (no shared model change).
- Changed source files within size guardrails: `Yes`. Converter 435, projector 199, lifecycle 102, turn 75 effective lines; backend under 260.

## Persisted Data Transition Check

- Approved decision: no migration. New failed markers use the existing provider_compaction_boundary trace type (non-rotating, optional error_message already supported). The 32 historical markers are untouched (REQ-C03 rejected).
- Deviation: `None`

## Environment Or Dependency Notes

- Setup in this worktree: `pnpm install --frozen-lockfile`, `prepare:shared` (builds autobyteus-ts and the SDK contracts), `prisma generate`, and web `nuxt prepare`. This leaves untracked `dist/` folders in two SDK packages, which are not committed.
- Local codex-cli is 0.160.0.

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit` (server src) → pass.
- Unit tests:
  - `codex-compaction-abandon.test.ts` 12/12
  - `codex-agent-run-backend.test.ts` 12/12
  - `raw-trace-to-historical-replay-events.test.ts` 10/10
  - Web `agentStatusHandler.spec.ts` 25/25
- Live E2E smoke, run once: `RUN_CODEX_E2E=1 vitest run tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts` → 1/1 in 14.6 s (real codex app server 0.160.0). This validates the test; it is not API/E2E sign-off.
- Regression sweep (unit agent-execution, agent-memory, run-history, runtime-management, services/agent-streaming; integration agent-execution, agent-memory, run-history; agent-work-traces) → 1784 passed, 54 failed in 16 files. The same 16 files fail identically (54 failed / 58 passed) on the base with my tracked changes stashed. That includes the three Codex-named files (codex-tool-log-correlation, codex-command-failure-transport, codex-mcp-tool-args-projection), so these failures are pre-existing and unrelated.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. There is no frontend change; the web's existing failed phase and provider-id pairing are reused (existing spec passes).

## Downstream Coverage Hints / Suggested Scenarios

- The live interrupt E2E, ideally repeated (it is timing-based), plus an interrupt during a manual `thread/compact/start` compaction if your harness can trigger one.
- Terminate a Codex run while a compaction is in progress (live or through the server): the failed close is persisted, and history shows a failed activity.
- App-server crash during a compaction: kill the codex app-server process. Expect a runtime ERROR with a failed close before it.
- Reopen history after an interrupted compaction: one failed compaction row, with no lingering "started".
- Codex completed-compaction regression (REQ-C04).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent execution of the live E2E and the scenarios above, with pass/fail classification.
- Web live and history rendering of the failed Codex compaction activity.
