# Handoff: Architecture Design Revised (SR-003) — autobyteus-533 (interrupt-idempotent-stop)

- Result: `Architecture Design Complete` (revision), SR-003, task_size `Medium`, architectural_risk `High` (unchanged) → architecture re-review.
- Trigger: ARCH-REV-001 Fail, `Design Impact`, finding AR-001 (`design-review-report.md`, `architecture-review-revision-record.md`).
- Package identifier: `interrupt-idempotent-stop` (Project Task autobyteus-533); requested by `/project_task_manager`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop`, `codex/interrupt-idempotent-stop` (see `git log -1`); base `origin/personal` `bd2053ee51`.
- Approval basis: requirements unchanged at SR-002 (approved by the Solution Designer within the Task's direction, user informed). SR-003 changes the design only.

## AR-001 resolution

Verified against the code: waiting Stops are drained at the drop (`AgentStreamingService.ts:316-326`, `TeamStreamingService.ts:281-287`, `agentOrgStreamingService.ts:133-140`), and the same service reconnects ≥1 s later. The SR-002 re-walk's "a rebind drains pending commands" was wrong.

New decision **D-W7**: on a retryable loss each streaming service moves waiting Stops to one shared holder, `InterruptsAwaitingRebind` (in `interruptCommandAdmission.ts`), and settles them `connection_lost` only after the rebind's status is applied (agent and peer: the first `AGENT_STATUS` of the new connection, sent on every open, `agent-stream-handler.ts:150-155`, `peer-run-stream-session.ts:78`; Team and Org: the snapshot that sets `ready`, `TeamStreamingService.ts:312-323`, `agentOrgStreamingService.ts:312`). They settle at once only when the stream is closed for good (agent `disconnect()` or a non-retryable loss; Team `disconnect()`; Org intentional close, release, credential-refusal close; peer `closeAll`). The Org service holds only `INTERRUPT_GENERATION` commands (timeout cleared); other commands keep today's rejection; the service stays ≤ 500 lines. `runInterrupt` is unchanged except for the adopted suggestion: the status watch starts at the press.

Corrected: DS-002 narrative, the new DS-002b return spine, DS-003, the behavior map row BEH-008, the ownership map, examples, file mapping, sequence step 5 with the required unit case (stream drops while Stopping → a press in the reconnect window sends and shows nothing → a rebind with Running enables Stop; a rebind with Idle/Offline shows Send; a final close settles at once), tradeoffs and risks. New re-walk: `evidence/spine-validation/sr-003-stop-spines-by-run-kind.md` (the SR-002 one is marked superseded).

## Unchanged

Server design (D-S1…D-S3), the other web decisions, removal plan, follow-ups FU-001/FU-002, reproductions.

## Expected next action

Re-review of SR-003 (D-W7 and the changed spines). On Pass, the reviewer routes to implementation per its rules.

## Route record

`get_handoff_rules` (2026-11-18): "Architecture Design Complete … architectural_risk=High … ready for independent architecture review" → `/architecture_reviewer`.
