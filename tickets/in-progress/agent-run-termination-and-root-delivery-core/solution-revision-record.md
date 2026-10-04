# Solution Revision Record — agent-run-termination-and-root-delivery-core

## SR-001 — 2026-10-04 — First requirements baseline (Ready for Approval)
- Trigger: a new-ticket request from `/code_reviewer` (run `code_reviewer_47ea626b23c646c88b7a7808d79784bf`), directed
  by the user: "do it as one combined ticket please … send to solution designer to bootstrap a new ticket."
- Prior status: N/A. Current status: Ready for Approval.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-and-root-delivery-core`,
  branch `codex/agent-run-termination-and-root-delivery-core`, base `origin/personal` @ `03d5db06b`, target `personal`.
- IDs: BEH-001–004, UC-001–005, SCN-001–005, REQ-001–007, AC-001–010, QR-001–002. Evidence: E-A1–A5, E-B1–B4,
  E-X1–X3.
- Findings beyond the request:
  - Part B has more drift than self-delegation (E-B3 D-2 to D-5). In particular, address delivery to a non-live child
    behaves differently per root.
  - Team's delivery mechanics are split between `team-run-message-delivery.ts` and `root-team-run.ts` (449 lines).
- Open decisions, each with a recommendation:
  - DEC-001: Org self-delegation code (the only behavior change);
  - DEC-002: preserve the other per-root differences;
  - DEC-003: ≤ 400-line target and the meaning of "unchanged";
  - DEC-004: phase gates.
- Approval: pending. Design: not started.
