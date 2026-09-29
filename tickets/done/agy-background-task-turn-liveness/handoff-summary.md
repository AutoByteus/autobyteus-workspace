# Handoff Summary — agy-background-task-turn-liveness

## Status

- Delivery state: **User verified (2026-09-29, "verfied. finalize and release a new beta").** The ticket is archived, finalized into `personal`, and a new beta is requested. See `release-deployment-report.md` for the final state.
- Classification: `task_size=Small`, `architectural_risk=Low`. Route: direct low-risk (Solution Designer → Implementation → API/E2E → Delivery).
- Independent architecture review, code review and test-code review: `N/A — not applicable` (direct route).
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness`
- Ticket branch: `codex/agy-background-task-turn-liveness`
- Finalization target: `origin/personal`
- Integrated base: `origin/personal@e6c16d801` (re-fetched 2026-09-28). Already current, no merge needed.
- Candidate state: commit `5dd87a33f`, plus the uncommitted API/E2E durable tests, the AGY doc known-limitation paragraph and the ticket artifacts. These are committed at finalization.

## What Changed

1. `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts`: removed the 300 s turn idle timer. A turn ends only on AGY `result`, process exit or protocol error, or user Stop/Terminate. The 60 s startup readiness timeout is unchanged.
2. `.../stream/agy-stream-event-converter.ts`: when `result` arrives while a started tool step is unfinished (for example an `IsDaemon` dev server), the step is closed before turn completion as `TOOL_EXECUTION_SUCCEEDED`. The payload is `provider_state: "RUNNING"` with output `Started as a background task; still running when the turn ended.`. Stop and process death still interrupt the step.
3. Docs: `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` describes the liveness contract and the known daemon-survival limitation.
4. Tests:
   - AGY unit tests (converter, process, lifecycle).
   - Fake-transport e2e: `agy-background-task-transport.e2e.test.ts` and fixture cases.
   - Opt-in live e2e: `agy-background-task-live.e2e.test.ts`, gated by `RUN_AGY_BACKGROUND_E2E=1`, about 9 minutes, needs an AGY login.
   - Web handler and hydration specs.

## Validation Evidence

- API/E2E Pass, API-REV-001, final confidence 96%.
  - Live AGY 1.2.12 with gemini-3.8-flash-high.
  - SCN-002: `sleep 330` gave no stream event for 330 s, and the turn completed normally.
  - SCN-001: the daemon card closed as RUNNING success before `TURN_COMPLETED`, history matches, no late events arrived, and the next turn was clean.
  - Stop: produced `TURN_INTERRUPTED`, with no background success.
- Delivery re-run on the integrated state (2026-09-28):
  - AGY unit folder: 100 passed, 5 skipped.
  - Fake-transport AGY e2e: 3 files, 8 tests passed.
  - Web specs: 41 of 41 passed.
- Evidence: `tickets/done/agy-background-task-turn-liveness/evidence/`

## Please Verify

Suggested check in your normal AutoByteus build or dev server, run from this worktree:

1. Start an AGY agent and ask it to run `sleep 330 && echo done` as a background command and then report. The turn should stay alive for more than 5 minutes and complete. There should be no "Antigravity runtime stopped unexpectedly".
2. Ask an AGY agent to start a dev server (a daemon), then do one more step. When the turn ends, the dev server tool card should show as succeeded with "Started as a background task; still running when the turn ended.", not spinning. Reload the run and check that history shows the same.
3. Optionally press Stop mid-turn while a daemon is running. The turn should be interrupted, and the tool card should not turn green.

Reply with explicit verification, for example "verified", to proceed to finalization. Also say whether you want a release (for example the next `1.4.91-beta.*`). By default, no release is cut.

## Residual Risks / Items For Your Decision

- **F-API-001 (non-blocking, pre-existing):** on AGY 1.2.12, a daemon that AGY has already backgrounded survives Stop/Terminate. It is reparented to PID 1 and can keep its port. The ticket's ASM-001 and investigation note CUR-6 are falsified by this. REQ-002 and AC-004 still hold, because the turn and the AGY process do end. A fix would need a background-process manager, which is Out Of Scope. **User decision (relayed by api_e2e_engineer on 2026-09-29):** keep the current scope and keep this as a known, recorded limitation. There is no requirement revision and no follow-up ticket for now. Feasibility evidence for a future fix: AGY gives each background command its own process group, and signalling AGY's descendant process groups before SIGTERM stopped the daemon cleanly in a raw-AGY probe. This is recorded in the AGY runtime doc.
- Closure of non-SUCCESS results is proven by unit tests only.
- The live run used a single model.
- Because there is no idle timeout, a truly hung AGY that neither emits events nor exits can now only be ended by user Stop/Terminate. This is the approved design (DEC-001).

## Artifacts

- Requirements, investigation, solution revision record, design spec and design handoff: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `handoff-architecture-design-complete.md`
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md`
- API/E2E: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `evidence/`
- Delivery: `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, this `handoff-summary.md`
