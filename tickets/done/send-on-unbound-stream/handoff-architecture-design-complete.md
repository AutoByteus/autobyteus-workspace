# Handoff: Architecture Design Complete — autobyteus-540 (send-on-unbound-stream)

- Result: `Architecture Design Complete`, SR-002, task_size `Medium`, architectural_risk `High` → independent architecture review.
- Package: `send-on-unbound-stream` (Project Task autobyteus-540, from autobyteus-533 FU-006, urgent); requested by `/project_task_manager`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream/tickets/in-progress/send-on-unbound-stream`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-on-unbound-stream`, `codex/send-on-unbound-stream` (see `git log -1`); base `origin/personal` `914eb36577`; finalization target `origin/personal`. Release only on the founder's word.
- Approval: requirements approved by the Solution Designer within the Task's direction (user informed); design approval not required.

## Request (summary)

A message sent on a run stream that has just opened is lost without a word (node answers `SESSION_NOT_READY`, draft cleared, no turn). Make the send wait for `CONNECTED` or resend; check Team and Org; probes must fail on a lost send; decide what the user sees if it still fails. Desktop and phone.

## Root cause

1. `ensureAgentStreamConnected` treats an open socket as ready; the protocol (FU-036) makes a run stream ready at the node's `CONNECTED`.
2. An agent send without mentions waits for no answer, and the snapshot after `CONNECTED` replaces the conversation, erasing the shown message and the refusal. Window: 0–5 ms on an idle node; ≥127 ms under load; a send at socket open to a just-stopped run was refused 15 of 16 times. Evidence: `investigation-notes.md`, `evidence/reproduction/`.

## Design (D-1…D-7)

Agent streams wait for `CONNECTED` (`whenBound`); every agent send awaits the node's answer; a send lost with its connection is held and decided after the rebind's snapshot by its message id; one typed outcome `MessageNotDeliveredError` (`not_sent` / `unknown`) presented once by the shared `failLocalSubmission` (draft back, the shown message removed when known not sent, a plain notice above the box, status unchanged); Team and Org classify their transport failures into it; the probes fail on a lost send. No node change. Spine re-walk: `evidence/spine-validation/sr-002-send-spines-by-run-kind.md`.

## Open risks

R-1 / ASM-001 (native runtime's stored message id, to confirm in implementation), R-2 (no ack timer), R-3 (Org files over the line limit, FU-001).

## Expected next action

Architecture review. On Pass, the reviewer routes to implementation per its rules.

## Route record

`get_handoff_rules` (2026-11-18): architectural_risk=High → `/architecture_reviewer`.
