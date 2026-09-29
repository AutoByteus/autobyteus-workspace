# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `agy-background-task-turn-liveness`
- Current solution revision: `SR-001`
- From: Solution Designer (`/solution_designer`)
- Date: 2026-09-28
- Classification: `task_size=Small`, `architectural_risk=Low`
- Route applied (via `get_handoff_rules`): direct implementation → `/implementation_engineer` (rule: Small/Medium and Low risk). Independent architecture review: `N/A — not applicable` for this classification.

## Original Request

The user's AutoByteus Org run broke when the Product Team's `product_prototyper` (Antigravity CLI / AGY runtime) started `pnpm dev` as a background daemon and continued working. After exactly 5 minutes AutoByteus's own AGY turn idle watchdog killed the healthy AGY process ("Antigravity runtime stopped unexpectedly"). The user requires that starting a long-running command and continuing is normal, non-breaking behavior, as with the other runtimes, and asked for a simple, not over-engineered design.

## Goals (Approved)

1. REQ-001/REQ-002: remove any silence-based termination of an AGY turn/process; keep startup timeout and all real failure detection; turns end on AGY `result`, process exit/stream failure, or user Stop/Terminate.
2. REQ-003/REQ-004: when AGY `result` arrives while a started tool step never finished (daemon), close it as `TOOL_EXECUTION_SUCCEEDED` with `provider_state: "RUNNING"` and output "Started as a background task; still running when the turn ended."; keep every other semantic unchanged.

## Approval Basis

- Requirements approved explicitly by the user on 2026-09-28 in the Solution Designer conversation ("Please go ahead. I approve."). Exact baseline: `requirements-doc.md` SR-001. No behavior-defining supplements.

## Workspace / Base / Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness`
- Branch: `codex/agy-background-task-turn-liveness`
- Base: `origin/personal` @ `e6c16d801`
- Finalization target: `personal`
- Note: the local `personal` checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is 6 commits behind `origin/personal`; work only in the task worktree.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/solution-revision-record.md`
- Supplements (evidence, reusable for AC-004 live validation):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/probes/agy-daemon-stream-order-probe.py`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-background-task-turn-liveness/tickets/in-progress/agy-background-task-turn-liveness/probes/agy-background-task-turn-end-probe.py`
- Architecture review artifacts: `N/A — not applicable` (Small/Low direct route)

## Scope Summary

- Production files: `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` (delete idle timer), `.../agy-stream-event-converter.ts` (track open tool steps; close as background on `result`).
- Tests: extend `tests/unit/agent-execution/backends/antigravity/agy-stream-event-converter.test.ts`; new `agy-stream-process.test.ts` (mocked spawn + fake timers, AC-001); optional interruption regression in `agy-turn-lifecycle.test.ts`.
- Doc: `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` short note.
- Out of scope: Org/Team Terminate robustness with dead members (separate Ticket B), ACP/Grok idle timer, UI hints, live progress from AGY files, any replacement timer.

## Key Evidence

- Incident: AutoByteus trace shows `pnpm dev` start → `TURN_INTERRUPTED` exactly 300.0 s later; AGY's own transcript shows the model kept working (steps 117–223) during that silence.
- Probe P1: daemon step never `DONE`; later steps withheld until `result`; turn ends with the daemon still running.
- Probe P2: non-daemon background task holds the turn open and delivers its completion notification inside the same turn; nothing arrives outside a turn.
- Other runtimes (Codex/Claude/AutoByteus) have no mid-turn idle kill.

## Open Risks

- If a future AGY emits a daemon `DONE` after `result`, the converter would reject it as outside a turn. Not observed (no events for 125 s after `result` in P1). API/E2E should keep the P1 pattern alive ≥ 2 min after `result`; if it appears, return `Design Impact`.
- A truly hung AGY (no exit, no `result`) now waits for user Stop, consistent with other runtimes (approved).

## Relevant Scenarios

- SCN-001 (daemon + continued work), SCN-002 (long non-daemon background task). Both Supported Normal Scenarios, evidence-backed.

## Expected Output / Next Action

Implementation Engineer implements per `design-spec.md` (Change / Refactor Sequence), runs the AGY unit suites and typecheck, and produces its implementation handoff per its own workflow and handoff rules. Return `Design Impact` / `Requirement Gap` findings to the Solution Designer.
