# Handoff: Architecture Design Complete (autobyteus-628, SR-001)

- Result: `Architecture Design Complete`, task_size `Medium`, architectural_risk `Low`, direct implementation route.
- Package: `conversation-order-628`. Task autobyteus-628 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`.
- Requested by: `/project_task_manager`, for the founder.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628`
- Branch: `codex/conversation-order-628` (no upstream)
- Base: `origin/personal` @ `1f761bc8db`
- Finalization target: `origin/personal`
- Constraints:
  - No release without the founder's word.
  - The founder's run data is evidence only (read-only).
  - Follow DESIGN.md and TESTING.md.

## Original request

The founder's own message showed below the agent's reply to it, in a Team member's conversation on the phone, after a "Skill updated" notice. Investigate whether this is a current bug or an old-format artifact (phone and desktop, live and reload), and fix it if it is a bug.

## Finding

- It is a current bug in the web's conversation window: rows are sorted by timestamps from two clocks.
- The stored traces are in order.
- Reproduced with the real web code: `probes/clock-order-reproduction.spec.ts`.

## Approval

Requirements SR-001, approved by the Solution Designer within the direction; user informed. No `Needs user` decision.

## Design

- **D-1 (web window):** conversation order for messages; compaction rows merged in by time.
- **D-2 (node replay):** a preface notice after the user message it came with, so reload equals live.

Details, the data contract and its validation are in `design-spec.md`.

## Classification evidence

- Medium: two owners (web window, node replay) and one probe case.
- Low: no field, route or stored-data change; one ordering invariant in the projection.

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`
- `follow-ups.md` (FU-001)
- `probes/` (the reproduction)

## Next expected action

Implementation, then API/E2E (the route rules).
