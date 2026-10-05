# API/E2E Coverage Investigation — Codex interrupted-compaction fix

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix/tickets/in-progress/codex-interrupted-compaction-fix/requirements-doc.md (SR-002, Approved)
- Investigation Notes: …/investigation-notes.md (C01–C16); Solution Revision Record: …/solution-revision-record.md; Design Spec: …/design-spec.md; Supplemental: …/probes/, …/solution-handoff.md (same ticket folder)
- Design Review / Architecture Review / Code Review artifacts: `N/A — not applicable` (direct route)
- Implementation Handoff / Revision Record: …/implementation-handoff.md, …/implementation-revision-record.md (IR-001, commit 69b0493f2)
- API/E2E Revision Record: api-e2e-revision-record.md; Ledger: api-e2e-test-case-ledger.md; Current API/E2E Revision ID: `API-REV-001`; Round 1
- Trigger: implementation_engineer "Implementation Complete" (IR-001)

## Routing Classification

- Medium / Low; `Direct Low-Risk` → `Delivery`; test-code review `Not Required — direct low-risk route`.

## Current Requirement And Design Basis

Every started Codex compaction must end: completed (unchanged, rotates once) or failed when its turn or run ends first. The endings are turn/completed of any status, a terminal turn or runtime error, an app-server close, or run terminate. The close uses the same provider_event_id, status failed, is non-rotating, and carries a reason error_message, emitted before the ending event (REQ-C01). Nothing else regresses: completed compactions, rotation, dedupe, Claude/AGY, history; no migration; the 32 historical cases are not rewritten (REQ-C04).

## Supported Scenarios And Real Usage

- Designer: SCN-C1 (interrupt during auto), SCN-C2 (interrupt during manual), SCN-C3 (turn completed/failed with open item; defensive), SCN-C4 (app-server close / terminal error), SCN-C5 (terminate during compaction), SCN-C6 (normal).
- Added: RU-1 reopen the run after an abandoned compaction (history service: one failed activity, not stuck); RU-2 the same run continues after a terminate/crash (restore) with no stale open compaction.
- Unsupported/contrived: none.
- Note on SCN-C2 live: AutoByteus never starts a manual Codex compaction (C02; `/compact` is out of scope), so SCN-C2 has no real AutoByteus trigger today; covered by the probe replay only.

## Changed Behavior Summary

| Behavior | Change | Coverage consequence |
| --- | --- | --- |
| BEH-C1 interrupted/abandoned → failed close | Added | replay units; live interrupt (repeat runs); history service |
| BEH-C2 terminate during compaction | Added | unit (listener order); **live terminate through AgentRunManager with real recorder (new)** — must prove the marker reaches disk |
| SCN-C4 app-server close | Added | unit; **live app-server SIGKILL during compaction (new)** |
| SCN-C6 / REQ-C04 | Preserved | replay of 6 normal pairs; sweep vs base; Claude/AGY suites in the sweep |

## Changed Surface And Boundary Classification

| Surface | Affected | Evidence available | Risk not exercised | Broader mode |
| --- | --- | --- | --- | --- |
| Domain/backend (projector, converters) | Yes | unit replays | — | — |
| Process/lifecycle (terminate, app-server crash) | Yes | unit with fakes | real terminate ordering vs recorder detach; real crash path | live E2E |
| Persisted data (failed markers) | Additive | accumulator in replay unit | real recorder on terminate/crash | live E2E |
| API/transport (websocket payload) | Same contract | converter unit | — | live harness events |
| Frontend/history | No code change | history replay unit, web spec (Claude failed shape) | Codex-shaped web case | web spec + history service on live memory |
| External (codex app-server 0.160.0) | Yes | probe fixtures | live timing variance | repeated live runs |

## Project Execution Discovery

- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix (69b0493f2). Guideline: TESTING.md (root; Codex live `RUN_CODEX_E2E=1`). codex-cli 0.160.0 (operator login and quota). Typecheck via `tsc -p tsconfig.build.json --noEmit` (pre-existing rootDir issue in the `typecheck` script).
- The live E2E launches its own app server with `-c model_auto_compact_token_limit=20000` (test-only, as in the probe C09/C10); temp workspace and memory dirs; it never touches ~/.autobyteus.

## Persisted Data Transition Coverage Basis

No migration; failed markers use the existing non-rotating provider boundary with error_message. Existing history suites run unchanged (sweep).

## Existing Durable Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| tests/unit/agent-execution/backends/codex/events/codex-compaction-abandon.test.ts | Still Valid | run |
| tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts (terminate) | Still Valid (fakes only) | run; live proof added |
| tests/unit/run-history/projection/raw-trace-to-historical-replay-events.test.ts | Still Valid | run |
| tests/e2e/runtime/codex-interrupted-compaction.e2e.test.ts | Needs Update | add terminate and app-server-crash cases and history-service assertions; run repeatedly |
| autobyteus-web agentStatusHandler.spec.ts | Still Valid | add a Codex-shaped started→abandoned case |

## Durable Coverage To Add / Update

| Case | Path | Requirement |
| --- | --- | --- |
| E2E-T | codex-interrupted-compaction.e2e.test.ts: terminate (AgentRunManager.terminateAgentRun) while the auto compaction runs. Revised after live diagnosis: AgentRun terminate waits for the active turn, so assert the real-use invariant (one terminal status, markers on disk, archives match, history never "started") | BEH-C2, SCN-C5, REQ-C01 |
| E2E-K | same file: SIGKILL the run's app-server child while compacting → failed `app_server_closed` before ERROR, marker on disk, no archive | SCN-C4 |
| E2E-I (update) | existing interrupt case + reopened history via AgentRunViewProjectionService | BEH-C1, RU-1 |
| WEB-1 | web spec Codex started→abandoned same row with error | AC-C01c |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan

1. Codex units + history unit; 2. tsc; 3. sweep HEAD vs base (03d5db06b); 4. web specs; 5. live E2E repeated (≥2 full runs).

## Test-Case Ledger Decision

`Yes` — live, timing-based cases. Path: api-e2e-test-case-ledger.md.

## Post-Repository Confidence And Broader Validation

Post-repository (units, sweep, web, before live): requirements 92 %, directness 90 %, integration 88 %, environment 92 %, failure/lifecycle 88 %, user surface 85 %, durable 95 %. Overall 90.0 %, with categories below 90 % → broader validation required. Executed:
- Live ×4.
- A packaged desktop journey. It became possible because the server loads the instance's own `server-data/.env`, which accepts the existing `CODEX_APP_SERVER_ARGS_JSON` launch option with the lowered limit.

Final 95.1 % (execution report).

## Broader Validation Decision (initial)

`Required` — live Codex app server through the real AgentRunManager/recorder for interrupt, terminate and crash. Desktop journey: assessed after the live runs. The product's app server cannot lower the auto-compaction limit (the flag is test-only), so a UI-triggered compaction would need a huge real context. The web/history contract is the same provider started→failed shape already rendered in the packaged app for Claude (prior ticket UI-02).

## Not Tested / Infeasible

| Behavior | Reason |
| --- | --- |
| SCN-C2 live through AutoByteus | no AutoByteus trigger for Codex manual compaction (out of scope) — replay only |
| SCN-C3 live (completed/failed turn with an open item) | never observed (defensive) — unit only |
| model-side compaction failure | not reproducible (C12) |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

Proceed `Yes`; durable coverage added/updated `Yes`; reroute `No`.
