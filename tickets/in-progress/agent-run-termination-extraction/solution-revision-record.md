# Solution Revision Record — agent-run-termination-extraction

## SR-001 — 2026-10-04 — First requirements baseline (Ready for Approval)
- Trigger: a new-ticket request from `/code_reviewer` (run `code_reviewer_47ea626b23c646c88b7a7808d79784bf`), directed
  by the user: "do it as one combined ticket please … send to solution designer to bootstrap a new ticket."
- Prior status: N/A. Current status: Ready for Approval.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-termination-extraction`,
  branch `codex/agent-run-termination-extraction`, base `origin/personal` @ `03d5db06b`, target `personal`.
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

## SR-002 — 2026-10-05 — Scope narrowed to Part A; package renamed (Ready for Approval)
- Trigger: the user's 2026-10-05 decision, after the value discussion: "lets do Part A in this ticket. after the ticket
  is done. we first validate for the bheavor for Part B. to chekc whether the its valuable or not right? … lets do the
  part a in the ticket."
- Prior status: SR-001 Ready for Approval (never approved). Current status: Ready for Approval.
- Package renamed `agent-run-termination-and-root-delivery-core` → `agent-run-termination-extraction`: worktree, branch
  and ticket folder. Done before any handoff; the old branch was never pushed.
- Scope: Part A only (REQ-001–003, AC-001–004, AC-009, BEH-001/002, UC-001/002, SCN-001/002).
- Retired IDs (moved to the follow-up): REQ-004–007, AC-005–008, AC-010, BEH-003/004, UC-003–005, SCN-003–005,
  DEC-001/002/004.
- AC-004 also requires the live AC-001-equivalent suites on Claude and Codex, because Stop is shared by every root.
- Part B is recorded as a deferred follow-up candidate whose first step validates D-3:
  `/Users/normy/autobyteus_org/solution-designer-reports/root-delivery-core-followup-candidate.md`. The E-B evidence
  is kept in `investigation-notes.md`.
- Open: DEC-003 (≤ 400 lines; the meaning of "unchanged"). Approval: pending confirmation. Design: not started.

## SR-003 — 2026-10-05 — Requirements approved
- Trigger: the user said "you decide. you have the design princples to follow. lets go. approve", in reply to the
  SR-002 baseline and the DEC-003 confirmation request.
- Status: Approved. The basis is the SR-002 requirements with DEC-003 as recommended (≤ 400 lines; "unchanged" means no
  assertion removed or relaxed).
- Next: architecture design.

## SR-004 — 2026-10-05 — Architecture design complete
- Trigger: requirements approved (SR-003).
- Evidence added: E-A6–E-A11 (project guideline, collaborator precedent, exact moving set, needs port, importers,
  docs).
- Design (`design-spec.md`):
  - New internal owner `AgentRunTermination` (`src/agent-execution/domain/agent-run-termination.ts`). It holds the
    termination lifecycle, fence attempt selection and scheduling, the quiescence predicates and
    `recoveryShutdownFenced`. It receives AgentRun state through an options port (E-A7 pattern) and never sees
    `AgentRun` itself.
  - `AgentRun` keeps 4 public methods as plain delegations (same async-ness, same promise identity), plus 4 evaluation
    triggers.
  - The fence and prepared-termination files are unchanged; all importers are unchanged; one additive coalescing test;
    docs name the owner.
  - Estimated `agent-run.ts` ≈ 365 lines, new file ≈ 190.
- Persisted data: Not Affected.
- Classification: `task_size=Medium`, `architectural_risk=High` (concurrency and blast radius on every Stop).
- Requirements: unchanged (basis SR-002/SR-003). Routing: per the handoff rules.
