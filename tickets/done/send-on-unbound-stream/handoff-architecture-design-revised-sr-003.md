# Handoff: Architecture Design Revised (SR-003) — autobyteus-540 (send-on-unbound-stream)

- Result: `Architecture Design Complete` (revision), SR-003, task_size `Medium`, architectural_risk `High` (unchanged) → architecture re-review.
- Trigger: ARCH-REV-001 Fail, `Design Impact`, AR-001 / MP-001 (`design-review-report.md`).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`, `codex/send-on-unbound-stream` (see `git log -1`); base `origin/personal` `914eb36577`.
- Approval: requirements refined at SR-003 within the Task's direction (Solution Designer; user informed).

## AR-001 resolution (option 1, with an honest fallback)

Verified against the code: the snapshot is stored + turn frames; queued input is in neither; nothing sends the input state on connect; native/AGY/ACP queue while a turn runs.

- **D-8 (node):** `AgentStreamSnapshotPayload.input_state: AgentInputStateDto | null`. `activeRunSnapshot` takes `readInputState` explicitly: the agent stream connection passes the bound run's `getInputStateSnapshot()` (`agent-run.ts:478`); the peer relay passes `null` (its run is reached through `RunAgentAccess`, which has no input state); a stopped run's snapshot has `null`.
- **Who supplies it and when:** the node, in the snapshot of the new connection. The page applies the stored part, then `input_state` through `handleAgentInputState` (replacing pending marks, which also removes the stale-overlay edge you noted), then the turn frames, and only then settles held sends.
- **D-3 revised:** found (stored, live turn, or queued) → delivered; missing with an input state → `not_sent` (a); missing without one → `unknown` (b). A queued message is never reported not sent.
- **Requirements (SR-003):** REQ-002 now says where queued input comes from and maps "cannot tell" to text (b); REQ-004 (b) and AC-003 follow; DEC-006 records the choice.
- Unit cases added to sequence step 1: the native/AGY/ACP queued send lost in flight is not reported not_sent; server snapshot unit (active: input state; stopped / peer: null); snapshot-shape test updates listed.
- Corrected: D-3, DS-002, the return spine, the "Lost in flight" example, the re-walk row (`evidence/spine-validation/sr-003-send-spines-by-run-kind.md`), the citation (`runProjectionConversation.ts:100`). Case 5 in `docs/design-cases.md` gains this ticket.

## Unchanged

D-1, D-2, D-4…D-7, the removal plan, FU-001.

## Expected next action

Re-review of SR-003 (D-3, D-8 and the changed spines). On Pass, the reviewer routes to implementation.

## Route record

`get_handoff_rules` (2026-11-18): architectural_risk=High → `/architecture_reviewer`.
